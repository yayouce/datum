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
    private graphRepository: Repository<Graph>,
    private sourceDonneesservice: SourceDonneesService
  ) {}




  
  async create(createGraphDto: CreateGraphDto, idsource: string): Promise<Graph> {
    const source = await this.sourceDonneesservice.getSourceById(idsource);
    if (!source) throw new HttpException("Source de données introuvable.", 700);

    // Extraction des valeurs de colonne depuis le fichier JSON
    const fichier = source.fichier;
    const colonneX = this.extractColumnValues(createGraphDto.colonneX, fichier);
    const colonneY = this.extractColumnValuesWithFormula(createGraphDto.colonneY, fichier);

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
    return this.formatGraphResponse(graphs);
}

async findOne(id: string): Promise<any> {
  const graph = await this.graphRepository.findOne({
      where: { idgraph: id },
      relations: ["sources"],
  });

  if (!graph) throw new HttpException(`Graphique avec l'ID ${id} introuvable.`, 705);

  return this.formatGraphResponse([graph])[0];
}

async findBySource(idsource: string): Promise<any[]> {
  const graphs = await this.graphRepository.find({
      where: { sourcesIdsourceDonnes: idsource },
      relations: ["sources"],
  });

  return this.formatGraphResponse(graphs);
}

async findByName(name: string): Promise<any[]> {
  const graphs = await this.graphRepository.find({
      where: { titreGraphique: name },
      relations: ["sources"],
  });

  if (!graphs.length) {
      throw new HttpException(`Aucun graphique trouvé avec le nom '${name}'.`, 706);
  }

  return this.formatGraphResponse(graphs);
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
      updateGraphDto.colonneX = this.extractColumnValues(updateGraphDto.colonneX, source.fichier);
    }
    if (updateGraphDto.colonneY) {
      updateGraphDto.colonneY = this.extractColumnValuesWithFormula(updateGraphDto.colonneY, source.fichier);
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













  // ✅ Fonction pour extraire les valeurs des colonnes (sans formule)
  private extractColumnValues(colonnes: any[], fichier: any): any[] {
    return colonnes.map(item => {
        const feuille = fichier.find(sheet => sheet[item.nomFeuille]);

        if (!feuille) {
            return { ...item, tabColonne: [] }; // Retourne un tableau vide si la feuille n'existe pas
        }

        const donnees = feuille[item.nomFeuille]?.donnees || [];

        // Récupérer la lettre de la colonne sans le numéro (ex: "A1" → "A")
        const colKey = item.colonne.replace(/\d+/g, '');

        // Extraire les valeurs à partir de la deuxième ligne (A2, A3, A4...)
        const values = donnees
            .slice(1) // Ignore A1, B1, C1...
            .map((row, index) => row[`${colKey}${index + 2}`]) // A2, A3, A4...
            .filter(val => val !== undefined && val !== null);

        return { ...item, tabColonne: values };
    });
}










  // ✅ Fonction pour extraire les valeurs des colonnes et appliquer des formules
  private extractColumnValuesWithFormula(colonnes: any[], fichier: any): any[] {
    return colonnes.map(item => {
        const feuille = fichier.find(sheet => sheet[item.nomFeuille]);

        if (!feuille) {
            return { ...item, tabColonne: [] }; // Retourne un tableau vide si la feuille n'existe pas
        }

        const donnees = feuille[item.nomFeuille]?.donnees || [];

        // Récupérer la colonne sans le chiffre (ex: "B1" → "B")
        const colKey = item.colonne.replace(/\d+/g, '');
        
        // Extraire les valeurs de la colonne en ignorant la première ligne
        const values = donnees
            .slice(1) // Ignore A1, B1, C1...
            .map((row, index) => row[`${colKey}${index + 2}`]) // B2, B3, B4...
            .filter(val => val !== undefined && val !== null);

        let computedValue = values;

        // Appliquer la formule
        if (item.formule === "somme") {
            computedValue = [values.reduce((acc, val) => acc + (parseFloat(val) || 0), 0)];
        } else if (item.formule === "moyenne") {
            computedValue = [values.length ? values.reduce((acc, val) => acc + (parseFloat(val) || 0), 0) / values.length : 0];
        }

        return { ...item, tabColonne: computedValue };
    });
}




private formatGraphResponse(graphs: Graph[]): any[] {
  return graphs.map(graph => {
      const source = graph.sources;
      if (!source || !source.fichier) return graph; // Retourne tel quel si pas de fichier

      return {
          typeGraphique: graph.typeGraphique,
          titreGraphique: graph.titreGraphique,
          colonneX: this.extractColumnValues(graph.colonneX || [], source.fichier),
          colonneY: this.extractColumnValuesWithFormula(graph.colonneY || [], source.fichier),
      };
  });
}







}
