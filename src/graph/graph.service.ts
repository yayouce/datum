import { HttpException, Injectable } from '@nestjs/common';
import { CreateGraphDto } from './dto/create-graph.dto';
import { UpdateGraphDto } from './dto/update-graph.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Graph } from './entities/graph.entity';
import { Repository } from 'typeorm';
import { SourceDonneesService } from 'src/source_donnees/source_donnees.service';
import { extractColumnValues, extractColumnValuesWithFormula, formatGraphResponse } from 'src/utils/Fonctions_utils';

@Injectable()
export class GraphService {
  constructor(
    @InjectRepository(Graph)
    private graphRepository: Repository<Graph>,
    private sourceDonneesservice: SourceDonneesService
  ) {}




  
  async create(createGraphDto: CreateGraphDto, idsource: string): Promise<Graph> {
    const source = await this.sourceDonneesservice.getSourceById(idsource);
    if (!source) throw new HttpException("Source de données introuvable.", 700);

    // Extraction des valeurs de colonne depuis le fichier JSON
    const fichier = source.fichier;
    const colonneX =extractColumnValues(createGraphDto.colonneX, fichier);
    const colonneY = extractColumnValuesWithFormula(createGraphDto.colonneY, fichier);

    const newGraph = this.graphRepository.create({
      ...createGraphDto,
      colonneX,
      colonneY,
      nomsourceDonnees: source.nomSource,
      sources: source,
    });

    return await this.graphRepository.save(newGraph);
  }

  async findAll(): Promise<any[]> {
    const graphs = await this.graphRepository.find({ relations: ["sources"] });
    return formatGraphResponse(graphs);
}

async findOne(id: string): Promise<any> {
  const graph = await this.graphRepository.findOne({
      where: { idgraph: id },
      relations: ["sources"],
  });

  if (!graph) throw new HttpException(`Graphique avec l'ID ${id} introuvable.`, 705);

  return formatGraphResponse([graph])[0];
}

async findBySource(idsource: string): Promise<any[]> {
  const graphs = await this.graphRepository.find({
      where: { sourcesIdsourceDonnes: idsource },
      relations: ["sources"],
  });

  return formatGraphResponse(graphs);
}

async findByName(name: string): Promise<any[]> {
  const graphs = await this.graphRepository.find({
      where: { titreGraphique: name },
      relations: ["sources"],
  });

  if (!graphs.length) {
      throw new HttpException(`Aucun graphique trouvé avec le nom '${name}'.`, 706);
  }

  return formatGraphResponse(graphs);
}

  async findByNameAndProject(name: string, projectId: string): Promise<Graph[]> {
    const graphs = await this.graphRepository
      .createQueryBuilder("graph")
      .innerJoinAndSelect("graph.sources", "sources")
      .innerJoin("sources.enquete", "enquete")
      .innerJoin("enquete.projet", "projet")
      .where("graph.titreGraphique = :name", { name })
      .andWhere("projet.idprojet = :projectId", { projectId })
      .getMany();

    if (!graphs.length) {
      throw new HttpException(`Aucun graphique trouvé avec le nom '${name}' pour le projet ${projectId}.`, 706);
    }

    return graphs;
  }

  async update(id: string, updateGraphDto: UpdateGraphDto): Promise<Graph> {
    const graph = await this.findOne(id);
    if (!graph) throw new HttpException(`Graphique avec l'ID ${id} introuvable.`, 705);

    const source = await this.sourceDonneesservice.getSourceById(graph.sourcesIdsourceDonnes);
    if (!source) throw new HttpException("Source de données introuvable.", 700);

    // Mettre à jour les valeurs extraites des colonnes
    if (updateGraphDto.colonneX) {
      updateGraphDto.colonneX = extractColumnValues(updateGraphDto.colonneX, source.fichier);
    }
    if (updateGraphDto.colonneY) {
      updateGraphDto.colonneY = extractColumnValuesWithFormula(updateGraphDto.colonneY, source.fichier);
    }

    Object.assign(graph, updateGraphDto);
    return await this.graphRepository.save(graph);
  }

  async softDelete(id: string): Promise<void> {
    const graph = await this.findOne(id);
    await this.graphRepository.softRemove(graph);
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







}
