import { HttpException, Injectable } from '@nestjs/common';
import { CreateGraphDto } from './dto/create-graph.dto';
import { UpdateGraphDto } from './dto/update-graph.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Graph } from './entities/graph.entity';
import { Repository } from 'typeorm';
import { SourceDonneesService } from 'src/source_donnees/source_donnees.service';

@Injectable()
export class GraphService {

  constructor(
      @InjectRepository(Graph)
      private graphRepository : Repository<Graph>,
      private sourceDonneesservice :  SourceDonneesService
  
   
  )
  {}


  async create(createGraphDto: CreateGraphDto, idsource: string): Promise<Graph> {
    const source = await this.sourceDonneesservice.getSourceById(idsource);
    
    if (!source) throw new HttpException("Source de données introuvable.", 700);
  
    const newGraph = this.graphRepository.create({
      ...createGraphDto,
      colonneY: createGraphDto.colonneY.map(item => ({
        colonne: item.colonne,
        formule: item.formule || null,
        nomFeuille: item.nomFeuille || null
      })),
      nomsourceDonnees: source.nomSource,
      sources: source,
    });
  
    return await this.graphRepository.save(newGraph);
  }
  

  
  async findAll(): Promise<Graph[]> {
    return await this.graphRepository.find({ relations: ["sources"] });
  }

  
  async findOne(id: string): Promise<Graph> {
    const graph = await this.graphRepository.findOne({
      where: { idgraph: id },
      relations: ["sources"],
    });
    if (!graph) throw new HttpException(`Graphique avec l'ID ${id} introuvable.`,705);
    return graph;
  }



  async findBySource(idsource: string): Promise<Graph[]> {
    return await this.graphRepository.find({
      where: { sourcesIdsourceDonnes: idsource },
      relations: ["sources"],
    });
  }


  async getGraphTitlesByProject(idprojet: string): Promise<string[]> {
    const results = await this.graphRepository
      .createQueryBuilder("graph")
      .leftJoin("graph.sources", "source")
      .leftJoin("source.enquete", "enquete")
      .leftJoin("enquete.projet", "projet")
      .where("projet.idprojet = :idprojet", { idprojet })
      .select("graph.titreGraphique", "titreGraphique") // Assurez-vous que l'alias est correct
      .getRawMany();
  
    return results.map(row => row.titreGraphique); // Extraire la bonne clé
  }

  
  async findByName(name: string): Promise<Graph[]> {
    const graphs = await this.graphRepository.find({
        where: { titreGraphique: name },
        relations: ["sources"],
    });

    if (!graphs.length) {
        throw new HttpException(`Aucun graphique trouvé avec le nom '${name}'.`, 706);
    }

    return graphs;
}
  


  




async update(id: string, updateGraphDto: UpdateGraphDto): Promise<Graph> {
  const graph = await this.findOne(id);

  if (!graph) throw new HttpException(`Graphique avec l'ID ${id} introuvable.`, 705);

  // Si colonneY est fourni, transformer la structure des données
  if (updateGraphDto.colonneY) {
    updateGraphDto.colonneY = updateGraphDto.colonneY.map(item => ({
      colonne: item.colonne,
      formule: item.formule || null,
      nomFeuille: item.nomFeuille || null
    }));
  }

  Object.assign(graph, updateGraphDto);

  return await this.graphRepository.save(graph);
}


  
  async softDelete(id: string): Promise<void> {
    const graph = await this.findOne(id);
    await this.graphRepository.softRemove(graph);
  }



  async findByNameAndProject(name: string, projectId: string): Promise<Graph[]> {
    const graphs = await this.graphRepository
        .createQueryBuilder("graph")
        .innerJoinAndSelect("graph.sources", "source")
        .innerJoinAndSelect("source.enquete", "enquete")
        .innerJoinAndSelect("enquete.projet", "projet")
        .where("graph.titreGraphique = :name", { name })
        .andWhere("projet.idprojet = :projectId", { projectId })
        .getMany();

    if (!graphs.length) {
        throw new HttpException(
            `Aucun graphique trouvé avec le nom '${name}' dans le projet spécifié.`,
            707
        );
    }

    return graphs;
}


  
}
