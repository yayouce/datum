import { HttpException, HttpStatus, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateGraphDto } from './dto/create-graph.dto';
import { UpdateGraphDto } from './dto/update-graph.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Graph, TypeGeometrieMap } from './entities/graph.entity';
import { Repository } from 'typeorm';
import { SourceDonneesService } from 'src/source_donnees/source_donnees.service';
import { extractColumnValues, extractColumnValuesWithFormula, formatGraphResponse } from 'src/utils/Fonctions_utils';
import { typegraphiqueEnum } from '@/generique/typegraphique.enum';
import { GeoService } from './geospatiale.service';
import { FeatureCollection, FeatureCollection as GeoJsonFeatureCollection } from 'geojson';

@Injectable()
export class GraphService {
  private readonly logger = new Logger(GraphService.name);
  constructor(
    @InjectRepository(Graph)
    private graphRepository: Repository<Graph>,
    private sourceDonneesservice: SourceDonneesService,
    private readonly geoService: GeoService,
  ) {}


// --- Fonction Helper pour déterminer si c'est un type de graphique géo ---
private isGeospatialType(graphType: typegraphiqueEnum): boolean {
  const geospatialTypes = [
      typegraphiqueEnum.CARTE_POINTS,
      typegraphiqueEnum.CARTE_POLYGONE,
      typegraphiqueEnum.CARTE_LIGNE,
      typegraphiqueEnum.CARTE_CHOROPLETHE,
      // typegraphiqueEnum.CARTE_DE_CHALEUR, // Si ajouté
  ];
  return geospatialTypes.includes(graphType);
}


// --- Méthode CREATE modifiée ---
async create2(createGraphDto: CreateGraphDto, idsource: string): Promise<any> { // Retourne la réponse formatée
  const source = await this.sourceDonneesservice.getSourceById(idsource);
  if (!source) {
    throw new NotFoundException(`Source de données avec ID "${idsource}" introuvable.`);
  }

  const processedData = source.bd_normales; // Adaptez si nécessaire
  if (!processedData || typeof processedData !== 'object') {
    throw new HttpException("Données traitées (bd_normales) introuvables ou invalides dans la source.", HttpStatus.INTERNAL_SERVER_ERROR);
  }

  let graphDataToSave: Partial<Graph>;
  let finalMetaDonnees: any = null; // Initialisation (restera null pour Géo par défaut)

  // ========== GRAPHIQUE GEOSPATIAL ==========
  if (this.isGeospatialType(createGraphDto.typeGraphique)) {
    const configGeo = createGraphDto.configGeographique;
    // --- Validation pour Géo ---
    if (!configGeo || !configGeo.typeGeometrie || !configGeo.nomGroupeDonnees) {
      throw new HttpException("Configuration géographique (configGeographique) incomplète ou manquante.", HttpStatus.BAD_REQUEST);
    }
    if (!processedData[configGeo.nomGroupeDonnees]) {
       throw new HttpException(`Le groupe de données '${configGeo.nomGroupeDonnees}' spécifié n'existe pas dans la source.`, HttpStatus.BAD_REQUEST);
    }
    // ... (autres validations géo: POINT, POLYGONE, LIGNE) ...
    if (createGraphDto.colonnesEtiquettes) {
       for (const etiquette of createGraphDto.colonnesEtiquettes) {
           if (!etiquette.headerText || !etiquette.libelleAffichage) {
               throw new HttpException("Chaque colonne d'étiquette doit avoir 'headerText' et 'libelleAffichage'.", HttpStatus.BAD_REQUEST);
           }
       }
    }

    // Les metaDonnees ne sont pas fournies via DTO à la création.
    // Si les graphiques Géo ont des metaDonnees par défaut spécifiques, définissez-les ici.
    // Exemple: finalMetaDonnees = { mapStyle: 'default', zoomLevel: 5 };
    // Sinon, elles restent null.

    // --- Préparation des données Géo ---
    graphDataToSave = {
      typeGraphique: createGraphDto.typeGraphique,
      titreGraphique: createGraphDto.titreGraphique,
      configGeographique: createGraphDto.configGeographique, // Fourni par DTO
      colonnesEtiquettes: createGraphDto.colonnesEtiquettes, // Fourni par DTO
      nomsourceDonnees: source.nomSource,
      sources: source,
      sourcesIdsourceDonnes: source.idsourceDonnes, // Assurez-vous que ce nom de propriété est correct
      colonneX: null,
      colonneY: null,
      metaDonnees: finalMetaDonnees, // Reste null ou défaut Géo
      titremetaDonnees: null, // Toujours null à la création
    };
  }

  // ========== GRAPHIQUE CLASSIQUE ==========
  else {
    // --- Validation pour Classique ---
    if (!createGraphDto.colonneX || !Array.isArray(createGraphDto.colonneX) || createGraphDto.colonneX.length === 0) {
      throw new HttpException("La définition pour colonneX est requise.", HttpStatus.BAD_REQUEST);
    }
    if (!createGraphDto.colonneY || !Array.isArray(createGraphDto.colonneY) || createGraphDto.colonneY.length === 0) {
       throw new HttpException("La définition pour colonneY est requise.", HttpStatus.BAD_REQUEST);
    }

    // --- Extraction des données (votre logique actuelle) ---
    const colonneXData = extractColumnValues(createGraphDto.colonneX, processedData);
    const extractedXValues = colonneXData.length > 0 ? colonneXData[0].tabColonne : [];
    const colonneXColonneId = colonneXData.length > 0 ? colonneXData[0].colonne : null;

    if (!extractedXValues.length) {
      throw new HttpException("La colonne X définie est invalide ou n'a pas retourné de valeurs.", HttpStatus.BAD_REQUEST);
    }

    const extractedYValues = extractColumnValuesWithFormula(
      createGraphDto.colonneY,
      processedData,
      extractedXValues,
      colonneXColonneId
    );

    if (extractedYValues.some(col => !col.valeurs || col.valeurs.length === 0)) {
       throw new HttpException("Erreur lors du calcul ou de l'extraction des valeurs pour les colonnes Y.", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // --- Génération des MetaDonnées par défaut (directement) ---
    const defaultGenericColors = ["#F44336", "#3F51B5", "#4CAF50", "#FF9800", "#9C27B0", "#00BCD4", "#FFC107", "#795548"];
    const generatedSpecificColors = extractedYValues.map((_, index) =>
        defaultGenericColors[index % defaultGenericColors.length]
    );

    // Assignation directe des valeurs par défaut générées
    finalMetaDonnees = {
        sensEtiquette: "horizontal",
        positionEtiquette: "exterieure",
        positionLegende: "bas",
        axesSpecifies: { x: true, y: true },
        couleurs: {
          generiques: defaultGenericColors,
          specifiques: generatedSpecificColors // Couleurs spécifiques générées ici
        },
        colonneXOriginale: colonneXColonneId // Utile si vous stockez les données extraites
    };

     // --- Préparation des données Classiques ---
    graphDataToSave = {
      typeGraphique: createGraphDto.typeGraphique,
      titreGraphique: createGraphDto.titreGraphique,
      // Stockez soit les données extraites (votre approche actuelle), soit la définition (createGraphDto.colonneX/Y)
      colonneX: extractedXValues,
      colonneY: extractedYValues,
      nomsourceDonnees: source.nomSource,
      sources: source,
      sourcesIdsourceDonnes: source.idsourceDonnes, // Vérifiez ce nom
      configGeographique: null,
      colonnesEtiquettes: null,
      metaDonnees: finalMetaDonnees, // ✨ METADONNEES GÉNÉRÉES PAR DÉFAUT ✨
      titremetaDonnees: null,       // ✨ TOUJOURS NULL À LA CRÉATION ✨
    };
  }
  // --- Sauvegarde ---
  const newGraph = this.graphRepository.create(graphDataToSave);
  console.log('--- AVANT SAVE ---');
console.log('Type de newGraph.metaDonnees:', typeof newGraph.metaDonnees);
console.log('Valeur de newGraph.metaDonnees:', JSON.stringify(newGraph.metaDonnees, null, 2)); // Affiche le JSON formaté

  try {
    const savedGraph = await this.graphRepository.save(newGraph);

    // --- Formatage de la réponse ---
    // Recharger avec la relation 'sources' est crucial si formatGraphResponse a besoin de sources.fichier
    const graphToFormat = await this.graphRepository.findOne({
        where: { idgraph: savedGraph.idgraph },
        relations: ['sources'], // Assurez-vous que 'sources' est le nom correct de la relation
    });

    if (!graphToFormat) {
         throw new NotFoundException("Graphique créé mais non retrouvé pour le formatage.");
    }
    // Vérification essentielle avant d'appeler le formateur
    if (!graphToFormat.sources || !graphToFormat.sources.fichier) {
          console.error(`Données de fichier manquantes pour le graphique ${graphToFormat.idgraph} lors du formatage (création).`);
          throw new HttpException("Données de fichier source manquantes pour formater la réponse.", HttpStatus.INTERNAL_SERVER_ERROR);
     }

     return formatGraphResponse(graphToFormat); // Appel de votre formateur

  } catch (error) {
    console.error("Erreur lors de la sauvegarde ou formatage du graphique:", error);
    throw new HttpException('Erreur interne du serveur lors de la création du graphique.', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}


// ... autres méthodes du service ...









  
  async create(createGraphDto: CreateGraphDto, idsource: string): Promise<Graph> {
    const source = await this.sourceDonneesservice.getSourceById(idsource);
    if (!source) throw new HttpException("Source de données introuvable.", 700);

    const fichier = source.fichier;

    // Extraction de colonneX (élèves uniques)
    const colonneXData = extractColumnValues(createGraphDto.colonneX, fichier);
    const colonneX = colonneXData.length > 0 ? colonneXData[0].tabColonne : [];
    const colonneXColonneId = colonneXData[0].colonne ;

    if (!colonneX || colonneX.length === 0) {
        throw new HttpException("La colonne X est invalide ou introuvable.", 701);
    }


    const colonneY = extractColumnValuesWithFormula(createGraphDto.colonneY, fichier, colonneX,colonneXColonneId);

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




async update(id: string, updateGraphDto: UpdateGraphDto): Promise<any> {
  this.logger.log(`Tentative de mise à jour (index 1-based) du graphique ID: ${id}`);
  this.logger.debug(`DTO d'update reçu: ${JSON.stringify(updateGraphDto)}`);

  const graph = await this.findOne(id);

  // --- Mise à jour champs simples ---
  // ... (titreGraphique, titremetaDonnees, nomsourceDonnees) ...

  // --- 1. MAJ globales metaDonnees ---
  let metaNeedsSave = false;
  if (updateGraphDto.metaDonnees !== undefined) {
     // ... (logique de fusion globale comme avant) ...
     metaNeedsSave = true;
      if (updateGraphDto.metaDonnees === null) { graph.metaDonnees = null; } else { /*... fusion ...*/ }
  }

  // --- 2. MAJ ciblées couleurY (par INDEX BASÉ SUR 1) ---
  if (updateGraphDto.couleurY && Array.isArray(updateGraphDto.couleurY)) {
       this.logger.log(`Application MAJ ciblées (couleurY index 1-based) pour ${id}`);
       metaNeedsSave = true;

       // Vérifier et préparer graph.colonneY et specifiques
       if (!graph.colonneY || !Array.isArray(graph.colonneY)) {
            throw new HttpException("Données colonneY manquantes pour la mise à jour ciblée.", HttpStatus.INTERNAL_SERVER_ERROR);
       }
       const currentColonneY = graph.colonneY;
       const nbY = currentColonneY.length;

       // Préparer specifiques comme avant (initialiser, synchroniser taille)
       if (!graph.metaDonnees) graph.metaDonnees = {};
       if (!graph.metaDonnees.couleurs) graph.metaDonnees.couleurs = {};
       // ... (logique d'initialisation/synchronisation de specifiques) ...
        if (!graph.metaDonnees.couleurs.specifiques || !Array.isArray(graph.metaDonnees.couleurs.specifiques)) { graph.metaDonnees.couleurs.specifiques = new Array(nbY).fill(null); }
        while (graph.metaDonnees.couleurs.specifiques.length < nbY) { graph.metaDonnees.couleurs.specifiques.push(null); }
        if (graph.metaDonnees.couleurs.specifiques.length > nbY) { graph.metaDonnees.couleurs.specifiques = graph.metaDonnees.couleurs.specifiques.slice(0, nbY); }
       const specifiques = graph.metaDonnees.couleurs.specifiques;


       for (const updateItem of updateGraphDto.couleurY) {
           const clientIndex = updateItem.indexY; // Index fourni par le client (1, 2, ...)
           const providedName = updateItem.colonneName;
           const newCouleur = updateItem.couleur;

           // ✨ Conversion vers index interne (0-based) ✨
           const internalIndex = clientIndex - 1;

           // Validation de l'index INTERNE
           if (internalIndex >= 0 && internalIndex < nbY) {
               // L'index interne est valide
               const actualColonneNameAtIndex = currentColonneY[internalIndex]?.colonne;

               // Validation optionnelle du nom
               if (actualColonneNameAtIndex === providedName) {
                   // Nom cohérent
                   if (newCouleur !== undefined) {
                      //  this.logger.debug(`MAJ Couleur Y[Client Idx:${clientIndex}/Internal Idx:${internalIndex}] (Nom:"${providedName}") à ${newCouleur} pour ${id}`);
                       specifiques[internalIndex] = newCouleur; // Utilise l'index interne
                   }
                   // if (newLegende !== undefined) { ... }
                } 
                //else {
              //      this.logger.warn(`Incohérence pour ${id}: L'index client ${clientIndex} (interne ${internalIndex}) contient "${actualColonneNameAtIndex}", mais le nom "${providedName}" a été fourni. MAJ ignorée.`);
              //  }
           } 
          // //else {
          //      // Index invalide
          //      this.logger.warn(`Index client ${clientIndex} (interne ${internalIndex}) invalide pour couleurY sur ${id}. Ignoré. (Nb Séries Y: ${nbY})`);
          //  }
       }
       graph.metaDonnees.couleurs.specifiques = specifiques; // Réassigne
  }

  // --- Sauvegarde ---
  try {
      this.logger.log(`Sauvegarde finale pour ${id}`);
      const savedGraph = await this.graphRepository.save(graph);
      this.logger.log(`Graphique ${id} sauvegardé.`);

      // --- Rechargement et Formatage ---
      this.logger.log(`Rechargement du graphique ${id} après sauvegarde pour formatage.`);
      const reloadedGraph = await this.findOne(id);

      if (!reloadedGraph.sources?.fichier) { this.logger.warn(`Fichier manquant sur ${id} rechargé.`); }
      return formatGraphResponse(reloadedGraph);

  } catch (error) {
      this.logger.error(`Erreur sauvegarde/rechargement (update) ${id}: ${error.message}`, error.stack);
      throw new HttpException('Erreur interne serveur (update).', HttpStatus.INTERNAL_SERVER_ERROR);
  }
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
      .where("projet.idprojet = :idprojet", { idprojet })// Assurez-vous que l'alias est correct
      .getRawMany();
  
    return results; // Extraire la bonne clé
  }



  async getTotalGraphsByProject(idprojet: string): Promise<number> {
    const count = await this.graphRepository
      .createQueryBuilder("graph")
      .leftJoin("graph.sources", "source")
      .leftJoin("source.enquete", "enquete")
      .leftJoin("enquete.projet", "projet")
      .where("projet.idprojet = :idprojet", { idprojet })
      .getCount(); 
  
    return count;
}


async findOneById(id: string): Promise<Graph | null> {
  return this.graphRepository.findOne({ where: { idgraph: id } });}


async generateGeoJsonForGraph(graphId: string): Promise<FeatureCollection> { // <-- Le type FeatureCollection vient de l'import 'geojson'
    this.logger.log(`Début génération GeoJSON orchestrée pour graph ID: ${graphId}`);

    // Étape 1: Récupérer config Graphique
    const graph = await this.findOneById(graphId);
    if (!graph) {
        throw new NotFoundException(`Graphique avec l'ID ${graphId} introuvable.`);
    }

    // Étape 2: Valider type
    // Remplissez les types géo réels de votre enum ici
    const geoGraphTypes = [ typegraphiqueEnum.CARTE_POLYGONE /*, typegraphiqueEnum.CARTE_POINTS, ... */ ];
    if (!geoGraphTypes.includes(graph.typeGraphique)) {
         // Utilisons BadRequestException pour une requête sémantiquement incorrecte
        throw new HttpException(`Graphique ${graphId} (type: ${graph.typeGraphique}) n'est pas un type cartographique valide pour cette opération.`,802);
        // Ou gardez votre HttpException si le code 802 a une signification spécifique
        // throw new HttpException(`Graphique ${graphId} (type: ${graph.typeGraphique}) n'est pas cartographique.`, 802);
    }

    // Étape 3: Valider config géo
    if (!graph.configGeographique || !graph.configGeographique.typeGeometrie || !graph.configGeographique.nomGroupeDonnees) {
         // Idem, BadRequestException est standard pour une configuration manquante/invalide
         throw new HttpException(`Configuration géographique manquante ou incomplète pour le graphique ${graphId}.`,800);
        // Ou gardez votre HttpException si le code 800 a une signification spécifique
        // throw new HttpException(`Configuration géographique manquante/incomplète pour graph ${graphId}.`, 800);
    }

    // Étape 4: Obtenir ID Source
    const sourceDonneeId = graph.sourcesIdsourceDonnes;
    if (!sourceDonneeId) {
        throw new NotFoundException(`Aucun ID de source de données associé au graphique ${graphId}.`); // Logique : sans ID, la ressource data est introuvable
    }

    // Étape 5: Récupérer entité Source
    const sourceDonnee = await this.sourceDonneesservice.findOneById(sourceDonneeId);
    if (!sourceDonnee) {
        throw new NotFoundException(`Source de données (ID: ${sourceDonneeId}) associée au graphique ${graphId} introuvable.`);
    }

    // Étape 6: Accéder et valider données brutes
    const rawData: any = sourceDonnee.bd_normales; // Ajustez si nécessaire
    const nomGroupe = graph.configGeographique.nomGroupeDonnees;
    if (!rawData || typeof rawData !== 'object' || !rawData[nomGroupe]) {
        // Les données spécifiques sont introuvables DANS la source trouvée -> 404
        throw new NotFoundException(`Données brutes requises (groupe '${nomGroupe}') manquantes ou invalides dans la source ID ${sourceDonneeId}.`);
    }

    // Étape 7: Appeler GeoService
    this.logger.log(`Appel de GeoService pour graph ID: ${graphId}`);
    try {
        // geoService.createGeoJsonData retourne un FeatureCollection de 'geojson'
        const geoJsonResult: FeatureCollection = this.geoService.createGeoJsonData(
            rawData,
            graph.configGeographique,
            graph.colonnesEtiquettes || [],
            graph.idgraph
        );
        this.logger.log(`GeoJSON généré par GeoService pour graph ${graphId}. Features: ${geoJsonResult.features.length}`);
        // Le type retourné correspond maintenant au type déclaré dans la signature de la fonction
        return geoJsonResult;

    } catch (error) {
        this.logger.error(`Erreur dans GeoService lors de la génération pour graph ${graphId}`, error.stack);
        if (error instanceof HttpException) {
            // Relance les erreurs HTTP déjà formatées (potentiellement de GeoService)
            throw error;
        }
        // Pour les erreurs inattendues de GeoService, utilisez InternalServerErrorException
         throw new InternalServerErrorException(`Erreur interne lors de la transformation des données pour le graphique ${graphId}.`);
        // Ou gardez votre HttpException si 802 est nécessaire
        // throw new HttpException(`Erreur interne lors de la transformation pour graph ${graphId}.`, 802);
    }
} // --- Fin de generateGeoJsonForGraph ---
// ... potentiellement d'autres méthodes dans GraphService (create, update, etc.)





}
