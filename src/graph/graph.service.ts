import { HttpCode, HttpException, HttpStatus, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateGraphDto } from './dto/create-graph.dto';
import { UpdateGraphDto } from './dto/update-graph.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ColonneEtiquetteConfig, ConfigGeographique, Graph, TypeGeometrieMap } from './entities/graph.entity';
import { Repository } from 'typeorm';
import { SourceDonneesService } from 'src/source_donnees/source_donnees.service';
import { extractColumnValues, extractColumnValuesWithFormula, formatGraphResponse } from 'src/utils/Fonctions_utils';
import { typegraphiqueEnum } from '@/generique/cartes.enum';
import { GeoService } from './geospatiale.service';
import { FeatureCollection, FeatureCollection as GeoJsonFeatureCollection } from 'geojson';
import { HttpStatusCode } from 'axios';
import { and } from 'mathjs';

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

  const processedData = source.fichier; // Adaptez si nécessaire
  if (!processedData || typeof processedData !== 'object') {
    throw new HttpException("Données traitées fichier introuvables ou invalides dans la source.", 800);
  }

  const existingGraphCount = await this.graphRepository.countBy({
    sourcesIdsourceDonnes: idsource 
    });
    const nextOrder = existingGraphCount + 1; 

  let graphDataToSave: Partial<Graph>;
  let finalMetaDonnees: any = null; // Initialisation (restera null pour Géo par défaut)

  // ========== GRAPHIQUE GEOSPATIAL ==========
  if (this.isGeospatialType(createGraphDto.typeGraphique)) {
    const configGeo = createGraphDto.configGeographique;
    // --- Validation pour Géo ---
    if (!configGeo || !configGeo.typeGeometrie || !configGeo.feuille) {
      throw new HttpException("Configuration géographique (configGeographique) incomplète ou manquante.", HttpStatus.BAD_REQUEST);
    }
    if (!processedData[configGeo.feuille]) {
       throw new HttpException(`La feuille de données '${configGeo.feuille}' spécifié n'existe pas dans la source.`, HttpStatus.BAD_REQUEST);
    }
    // ... (autres validations géo: POINT, POLYGONE, LIGNE) ...
    if (createGraphDto.colonnesEtiquettes) {
       for (const etiquette of createGraphDto.colonnesEtiquettes) {
           if (!etiquette.colonne ) {
               throw new HttpException("Chaque colonne d'étiquette doit avoir 'colonne' ", HttpStatus.BAD_REQUEST);
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
      titremetaDonnees: null, // Toujours null à la création,
      ordre:nextOrder,
      
    };
  }

  // ========== GRAPHIQUE CLASSIQUE ==========
  else {
    // --- Validation pour Classique ---
    if (!createGraphDto.colonneX || !Array.isArray(createGraphDto.colonneX) || createGraphDto.colonneX.length === 0) {
      throw new HttpException("La définition pour colonneX est requise.", 800);
    }
    if (!createGraphDto.colonneY || !Array.isArray(createGraphDto.colonneY) || createGraphDto.colonneY.length === 0) {
       throw new HttpException("La définition pour colonneY est requise.", 800);
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
      titremetaDonnees: null,       // ✨ TOUJOURS NULL À LA CRÉATION ✨,
      ordre:nextOrder,
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

async findOneGraphiqebyID(idgraph:string):Promise<Graph>{
try{

  const graph=await this.graphRepository.findOneBy({idgraph})
  

    return formatGraphResponse(graph)
  
}
catch(err){
  throw new HttpException(err.message,802)
}


}

async InOutstudio(idgraph:string){
  try{
    const graph = await this.findOneGraphiqebyID(idgraph)
 
    if(!graph){
      throw new HttpException("graph non trouvée",705)
    }
  graph.inStudio=!graph.inStudio
  await this.graphRepository.save(graph)
  return graph.inStudio
  }
  catch(err){
    throw new HttpException(err.message,705)
  }
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




async update(idgraph: string, updateGraphDto: UpdateGraphDto): Promise<any> { // Type de retour peut être plus précis
  this.logger.log(`Mise à jour graphique ID: ${idgraph}`);
  // this.logger.debug(`DTO update: ${JSON.stringify(updateGraphDto)}`); // Optionnel pour débug

  // 1. Trouver le graphique existant
  let graph: Graph;
  try {
      // Charger avec 'sources' si formatGraphResponse en a besoin même en cas de non-modification
      graph = await this.graphRepository.findOneOrFail({
          where: { idgraph },
          relations: ['sources'], // Charger la relation si formatGraphResponse en a besoin
      });
  } catch (error) {
      this.logger.warn(`Graphique ID ${idgraph} non trouvé.`);
      throw new NotFoundException(`Graphique avec l'ID "${idgraph}" non trouvé.`);
  }

  // 2. Appliquer les mises à jour depuis le DTO
  let changesMade = false;

  // Itération sur les clés du DTO pour màj sélective
  for (const key in updateGraphDto) {
      if (Object.prototype.hasOwnProperty.call(updateGraphDto, key) && updateGraphDto[key] !== undefined) {

          // --- Traitement Spécial pour metaDonnees (Fusion) ---
          if (key === 'metaDonnees') {
              if (updateGraphDto.metaDonnees) {
                  const existingMeta = graph.metaDonnees || {};
                  const newMetaFromDto = updateGraphDto.metaDonnees ; // Cast pour types

                  // Fusion des metaDonnees
                  graph.metaDonnees = {
                      ...existingMeta,
                      ...newMetaFromDto, // Écrase/ajoute les clés simples

                      // Fusion explicite des objets imbriqués si présents dans le DTO
                      axesSpecifies: {
                          ...(existingMeta.axesSpecifies || {}),
                          ...(newMetaFromDto.axesSpecifies || {}),
                      },
                      couleurs: { // Fusionne la section couleurs
                          ...(existingMeta.couleurs || {}),
                          ...(newMetaFromDto.couleurs || {}),
                          // NOTE: Si specifiques/generiques sont dans le DTO, ils remplacent les anciens
                      },
                      couleursParElementX: { // Fusionne les couleurs spécifiques par X
                          ...(existingMeta.couleursParElementX || {}), // Garde les anciennes
                          ...(newMetaFromDto.couleursParElementX || {}), // Ajoute/écrase avec les nouvelles
                      }
                  };
                  // Optionnel: Nettoyer les objets vides après fusion
                  if (graph.metaDonnees.couleursParElementX && Object.keys(graph.metaDonnees.couleursParElementX).length === 0) {
                      delete graph.metaDonnees.couleursParElementX;
                  }

                  changesMade = true; // Marquer un changement
                  this.logger.debug(`Fusion des 'metaDonnees' pour ${idgraph}`);
              } else if (graph.metaDonnees !== null) {
                  // Si le DTO envoie explicitement null pour metaDonnees
                  graph.metaDonnees = null;
                  changesMade = true;
              }
          }
          // --- Traitement pour les autres clés ---
          // Exclure 'metaDonnees' et 'couleurY' (traités spécialement)
          else if (key !== 'couleurY' && key in graph && graph[key] !== updateGraphDto[key]) {
             // Comparaison simple, peut nécessiter une comparaison profonde pour objets/tableaux non traités spécifiquement
              changesMade = true;
              this.logger.debug(`Mise à jour champ '${key}' pour ${idgraph}`);
              // Assignation directe pour les autres champs (types gérés par DTO/Entity)
              graph[key] = updateGraphDto[key];
          }
          // --- Logique spécifique pour colonnesEtiquettes, configGeographique, etc. si la comparaison simple ne suffit pas ---
          // Exemple: si on veut fusionner des tableaux au lieu de remplacer
          // else if (key === 'colonnesEtiquettes') { ... logique de fusion ... }
      }
  }


  // --- 3. Traitement SPÉCIFIQUE pour 'couleurY' (Modification metaDonnees.couleurs.specifiques) ---
  // S'exécute APRES la fusion potentielle de metaDonnees
  if (updateGraphDto.couleurY && Array.isArray(updateGraphDto.couleurY) && updateGraphDto.couleurY.length > 0) {
      this.logger.log(`Application MAJ ciblées (couleurY) pour ${idgraph}`);

      if (!graph.colonneY || !Array.isArray(graph.colonneY) || graph.colonneY.length === 0) {
          this.logger.warn(`Données colonneY manquantes pour MAJ couleurY sur ${idgraph}. Ignoré.`);
      } else {
          const currentColonneY = graph.colonneY as {colonne: string}[]; // Adapter type si besoin
          const nbY = currentColonneY.length;

          // Initialiser metaDonnees et couleurs specifiques si nécessaire
          if (!graph.metaDonnees) graph.metaDonnees = {};
          if (!graph.metaDonnees.couleurs) graph.metaDonnees.couleurs = {};
          if (!graph.metaDonnees.couleurs.specifiques || !Array.isArray(graph.metaDonnees.couleurs.specifiques)) {
              graph.metaDonnees.couleurs.specifiques = new Array(nbY).fill(null);
          }

          // Ajuster taille du tableau specifiques
          let specifiques = graph.metaDonnees.couleurs.specifiques;
          while (specifiques.length < nbY) { specifiques.push(null); }
          if (specifiques.length > nbY) { specifiques = specifiques.slice(0, nbY); }

          let specifiquesModified = false;
          for (const updateItem of updateGraphDto.couleurY) {
              const internalIndex = updateItem.indexY; // Index base 0 attendu du DTO
              const providedName = updateItem.colonne;
              const newCouleur = updateItem.couleur;

              if (internalIndex >= 0 && internalIndex < nbY) {
                  const actualColonneNameAtIndex = currentColonneY[internalIndex]?.colonne;
                  // Validation optionnelle du nom
                  if (actualColonneNameAtIndex === providedName) {
                      if (newCouleur !== undefined && specifiques[internalIndex] !== newCouleur) {
                          specifiques[internalIndex] = newCouleur;
                          specifiquesModified = true;
                      }
                  } else {
                       this.logger.warn(`Incohérence nom/index pour couleurY ${idgraph}: index ${internalIndex} (${actualColonneNameAtIndex}) != nom fourni (${providedName}). Ignoré.`);
                  }
              } else {
                   this.logger.warn(`Index ${internalIndex} invalide pour couleurY sur ${idgraph}. Ignoré.`);
              }
          }

          if (specifiquesModified) {
              graph.metaDonnees.couleurs.specifiques = specifiques;
              changesMade = true; // Marquer qu'une sauvegarde est nécessaire
          }
      }
  }


  // --- Sauvegarde UNIQUEMENT si des changements ont été détectés ---
  if (!changesMade) {
      this.logger.log(`Aucun changement détecté pour ${idgraph}, pas de sauvegarde.`);
       // Vérifier si le formatage nécessite des données fichier qui ont été chargées
       if (!graph.sources?.fichier && formatGraphResponse.length > 0) { // Vérifie si formatGraphResponse est utilisé
           this.logger.warn(`Formatage demandé mais fichier source potentiellement manquant pour ${idgraph} (non modifié).`);
       }
      return formatGraphResponse(graph); // Retourne le graphique original formaté
  }

  try {
      this.logger.log(`Sauvegarde des modifications pour ${idgraph}`);
      const savedGraph = await this.graphRepository.save(graph); // save met à jour l'entité
      this.logger.log(`Graphique ${idgraph} sauvegardé.`);

       // Vérifier si formatGraphResponse a besoin de données non retournées par save()
       if (!savedGraph.sources?.fichier && formatGraphResponse.length > 0) {
            this.logger.warn(`Relation 'sources' non chargée après save pour ${idgraph}. Rechargement peut être nécessaire si formatage utilise fichier.`);
            // Optionnel: recharger si absolument nécessaire
            // const reloadedGraph = await this.graphRepository.findOneOrFail({ where: { idgraph }, relations: ['sources'] });
            // return formatGraphResponse(reloadedGraph);
       }
      return formatGraphResponse(savedGraph); // Utilise l'entité retournée par save

  } catch (error) {
      this.logger.error(`Erreur sauvegarde (update) ${idgraph}: ${error.message}`, error.stack);
      if (error instanceof QueryFailedError) {
           throw new HttpException(`Erreur BDD lors de la mise à jour: ${error.message}`, 800); // Attention au code 800
      }
      throw new HttpException('Erreur interne serveur lors de la sauvegarde.', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}



  async softDelete(id: string): Promise<void> {
    const graph = await this.findOne(id);
    await this.graphRepository.softRemove(graph);
  }




  async getGraphByProject(idprojet: string): Promise<string[]> {
    const results = await this.graphRepository
      .createQueryBuilder("graph")
      .leftJoin("graph.sources", "source")
      .leftJoin("source.enquete", "enquete")
      .leftJoin("enquete.projet", "projet")
      .where("projet.idprojet = :idprojet", { idprojet })
      .getMany();
  
    return   results.map(graph => formatGraphResponse(graph));
  }



  async getGraphByProjectInStudio(idprojet: string): Promise<string[]> {
    const results = await this.graphRepository
      .createQueryBuilder("graph")
      .leftJoin("graph.sources", "source")
      .leftJoin("source.enquete", "enquete")
      .leftJoin("enquete.projet", "projet")
      .where("projet.idprojet = :idprojet", { idprojet })
      .andWhere("graph.inStudio=true")
      .getMany();
    return results.map(graph => formatGraphResponse(graph));
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
  return this.graphRepository.findOne({ where: { idgraph: id } });
}


async generateGeoJsonForGraph(graphId: string): Promise<FeatureCollection> { // <-- Le type FeatureCollection vient de l'import 'geojson'
  // this.logger.log(`Début génération GeoJSON orchestrée pour graph ID: ${graphId}`);

    // Étape 1: Récupérer config Graphique
    const graph = await this.findOneById(graphId);
    if (!graph) {
        throw new NotFoundException(`Graphique avec l'ID ${graphId} introuvable.`);
    }

    // Étape 2: Valider type
    // Remplissez les types géo réels de votre enum ici
    const geoGraphTypes = [ typegraphiqueEnum.CARTE_POLYGONE , typegraphiqueEnum.CARTE_POINTS,typegraphiqueEnum.CARTE_LIGNE ];
    if (!geoGraphTypes.includes(graph.typeGraphique)) {
     
        throw new HttpException(`Graphique ${graphId} (type: ${graph.typeGraphique}) n'est pas un type cartographique valide pour cette opération.`,802);
    
    }

    // Étape 3: Valider config géo
    if ( !graph.configGeographique.typeGeometrie || !graph.configGeographique.feuille) {
         // Idem, BadRequestException est standard pour une configuration manquante/invalide
         throw new HttpException(`configGeographique,typeGeometrie ou feuille manquante  pour le graphique ${graphId}.`,800);
      
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
    const rawData: any = sourceDonnee.fichier||sourceDonnee.bd_normales; // Ajustez si nécessaire
    const nomGroupe = graph.configGeographique.feuille;
    if (!rawData || typeof rawData !== 'object' || !rawData[nomGroupe]) {
     
        throw new NotFoundException(`Données brutes requises (groupe '${nomGroupe}') manquantes ou invalides dans la source ID ${sourceDonneeId}.`);
    }

    // Étape 7: Appeler GeoService
    try {

        const geoJsonResult: FeatureCollection = this.geoService.createGeoJsonData(
            rawData,
            graph.configGeographique,
            graph.colonnesEtiquettes || [],
            graph.idgraph
        );
        return geoJsonResult;

    } catch (error) {
        if (error instanceof HttpException) {
  
            throw new HttpException(error.message,800);
        }
        // Pour les erreurs inattendues de GeoService,
         throw new HttpException(`Erreur interne lors de la transformation des données pour le graphique ${graphId}.`,800);
   
    }
} 











}
