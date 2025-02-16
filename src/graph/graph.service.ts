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

    const fichier = source.fichier;

    // Extraction de colonneX (élèves uniques)
    const colonneXData = extractColumnValues(createGraphDto.colonneX, fichier);
    const colonneX = colonneXData.length > 0 ? colonneXData[0].tabColonne : [];

    if (!colonneX || colonneX.length === 0) {
        throw new HttpException("La colonne X est invalide ou introuvable.", 701);
    }

    console.log(`🟢 Élèves extraits pour la colonne X:`, colonneX);

    // Extraction de colonneY avec calculs par élève
    const colonneY = extractColumnValuesWithFormula(createGraphDto.colonneY, fichier, colonneX);

    console.log(`🟢 Résultats des calculs de colonne Y:`, colonneY);

    if (colonneY.some(col => col.valeurs.length === 0 || col.valeurs.every(val => val === 0))) {
        throw new HttpException("Les colonnes Y n'ont pas été bien calculées.", 702);
    }

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
  return graphs.map(graph => formatGraphResponse(graph));
}

async findOne(id: string): Promise<any> {
  const graph = await this.graphRepository.findOne({
    where: { idgraph: id },
    relations: ["sources"],
  });

  if (!graph) throw new HttpException(`Graphique avec l'ID ${id} introuvable.`, 705);

  return formatGraphResponse(graph);
}

async findBySource(idsource: string): Promise<any[]> {
  const graphs = await this.graphRepository.find({
    where: { sourcesIdsourceDonnes: idsource },
    relations: ["sources"],
  });

  return graphs.map(graph => formatGraphResponse(graph));
}

async findByName(name: string): Promise<any[]> {
  const graphs = await this.graphRepository.find({
    where: { titreGraphique: name },
    relations: ["sources"],
  });

  if (!graphs.length) {
    throw new HttpException(`Aucun graphique trouvé avec le nom '${name}'.`, 706);
  }

  return graphs.map(graph => formatGraphResponse(graph));
}

async findByNameAndProject(name: string, projectId: string): Promise<any[]> {
  const graphs = await this.graphRepository
    .createQueryBuilder("graph")
    .innerJoinAndSelect("graph.sources", "sources")
    .innerJoin("sources.enquete", "enquete")
    .innerJoin("enquete.projet", "projet")
    .where("graph.titreGraphique = :name", { name })
    .andWhere("projet.idprojet = :projectId", { projectId })
    .getMany();

  if (!graphs.length) {
    throw new HttpException(
      `Aucun graphique trouvé avec le nom '${name}' pour le projet ${projectId}.`,
      706
    );
  }

  return graphs.map(graph => formatGraphResponse(graph));
}




  async update(id: string, updateGraphDto: UpdateGraphDto): Promise<Graph> {
    const graph = await this.findOne(id);
    if (!graph) throw new HttpException(`Graphique avec l'ID ${id} introuvable.`, 705);

    const source = await this.sourceDonneesservice.getSourceById(graph.sourcesIdsourceDonnes);
    if (!source) throw new HttpException("Source de données introuvable.", 700);

    const fichier = source.fichier;

    // Mise à jour des valeurs extraites des colonnes
    let colonneXData: any[] = [];
    let colonneX: string[] = [];

    if (updateGraphDto.colonneX) {
        colonneXData = extractColumnValues(updateGraphDto.colonneX, fichier);
        colonneX = colonneXData.length > 0 ? colonneXData[0].tabColonne : [];

        if (!colonneX || colonneX.length === 0) {
            throw new HttpException("La colonne X est invalide ou introuvable.", 701);
        }
    }

    let colonneY: any[] = [];
    if (updateGraphDto.colonneY) {
        colonneY = extractColumnValuesWithFormula(updateGraphDto.colonneY, fichier, colonneX);

        if (colonneY.some(col => col.valeurs.length === 0 || col.valeurs.every(val => val === 0))) {
            throw new HttpException("Les colonnes Y n'ont pas été bien calculées.", 702);
        }
    }

    // Mettre à jour les champs du graphique
    Object.assign(graph, {
        ...updateGraphDto,
        colonneX,
        colonneY,
        nomsourceDonnees: source.nomSource
    });

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
