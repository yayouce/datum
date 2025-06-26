import { BadRequestException, ForbiddenException, HttpCode, HttpException, HttpStatus, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateGraphDto } from './dto/create-graph.dto';
import { UpdateGraphDto } from './dto/update-graph.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ColonneEtiquetteConfig, ConfigGeographique, Graph, TypeGeometrieMap } from './entities/graph.entity';
import { EntityNotFoundError, Repository } from 'typeorm';
import { SourceDonneesService } from 'src/source_donnees/source_donnees.service';
import { extractColumnValues, extractColumnValuesWithFormula, formatGraphResponse, FormattedGraphResponse } from 'src/utils/Fonctions_utils';
import { typegraphiqueEnum } from '@/generique/cartes.enum';
import { GeoService } from './geospatiale.service';
import { FeatureCollection, FeatureCollection as GeoJsonFeatureCollection } from 'geojson';
import { DOMParser } from '@xmldom/xmldom'; // Fonctionne bien en statique
import * as AdmZip from 'adm-zip';   
import * as shapefile from 'shapefile'; 
import { ImportMapFileDto } from './dto/importMapFile.dto';
import { UserEntity } from '../user/entities/user.entity';
import { MembreStruct } from '../membre-struct/entities/membre-struct.entity';
import { UserRole } from '../generique/userroleEnum';

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
    
      // typegraphiqueEnum.CARTE_DE_CHALEUR, // Si ajouté
  ];
  return geospatialTypes.includes(graphType);
}


// --- Méthode CREATE---
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
      throw new HttpException("La défiknition pour colonneX est requise.", 800);
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

  return formatGraphResponse(graph) as FormattedGraphResponse;
}

async findBySource(idsource: string): Promise<any[]> {
  const graphs = await this.graphRepository.find({
    where: { sourcesIdsourceDonnes: idsource },
    relations: ["sources"],
  });

  return graphs.map(graph => formatGraphResponse(graph));
}


async findOneGraphiqebyID(idgraph: string): Promise<FormattedGraphResponse> { 
  let graph: Graph;
  try {
      graph = await this.graphRepository.findOneOrFail({
          where: { idgraph },
          relations: ["sources"], // <--- ESSENTIEL pour charger les sources
      });
  } catch (error) {
       // Gestion spécifique de l'erreur si findOneOrFail ne trouve rien
       if (error instanceof EntityNotFoundError) {
           throw new NotFoundException(`Graphique avec l'ID "${idgraph}" non trouvé.`); 
       }
  }
      const formattedResponse = await formatGraphResponse(graph);
      return formattedResponse;
}








async InOutstudio(idgraph: string): Promise<boolean> { // Retourne le nouveau statut boolean
  let graphEntity: Graph;
  try {
      
      graphEntity = await this.graphRepository.findOneByOrFail({ idgraph });

  } catch (error) {
      if (error instanceof EntityNotFoundError) {
          throw new NotFoundException(`Graphique avec l'ID "${idgraph}" non trouvé.`);
      }
      // Gérer d'autres erreurs de base de données lors de la récupération
      throw new HttpException(`Erreur BDD lors de la recherche de ${idgraph}: ${error.message}`, 800);
  }
  graphEntity.inStudio = !graphEntity.inStudio;

  try {
      await this.graphRepository.save(graphEntity);
      return graphEntity.inStudio;

  } catch (saveError) {
      throw new HttpException(`Erreur BDD lors de la sauvegarde du statut pour ${idgraph}: ${saveError.message}`, 800);
  }
}


// async InOutstudio(idgraph:string):Promise<any>{
//   try{
//     const graph = await this.findOneGraphiqebyID(idgraph)
 
//     if(!graph){
//       throw new HttpException("graph non trouvée",705)
//     }
//   graph.inStudio=!graph.inStudio
//   await this.graphRepository.save(graph)
//   return graph.inStudio
//   }
//   catch(err){
//     throw new HttpException(err.message,705)
//   }
// }



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

  return graphs.map(graph => formatGraphResponse(graph) as FormattedGraphResponse);
}










async update(idgraph: string, updateGraphDto: UpdateGraphDto): Promise<any> { // Utilisez un type plus précis si possible (ex: Graph ou un DTO de réponse)
  this.logger.log(`Tentative de mise à jour du graphique ID: ${idgraph}`);
  this.logger.debug(`DTO d'update reçu: ${JSON.stringify(updateGraphDto)}`);

  // 1. Trouver le graphique existant
  // Utiliser findOneOrFail pour lancer NotFoundException automatiquement si non trouvé
  let graph: Graph;
  try {
      graph = await this.graphRepository.findOneOrFail({ where: { idgraph } });
  } catch (error) {
      this.logger.warn(`Graphique ID ${idgraph} non trouvé pour la mise à jour.`);
      throw new NotFoundException(`Graphique avec l'ID "${idgraph}" non trouvé.`);
  }

  // 2. Appliquer les mises à jour depuis le DTO
  // On parcourt les clés du DTO pour mettre à jour UNIQUEMENT ce qui est fourni.
  let changesMade = false;

  for (const key in updateGraphDto) {
      if (Object.prototype.hasOwnProperty.call(updateGraphDto, key) && updateGraphDto[key] !== undefined) {
           // On vérifie si la valeur est différente de celle existante (optionnel, mais évite des écritures inutiles)
           // Attention: comparaison profonde nécessaire pour les objets/tableaux si vous voulez être précis
           if (graph[key] !== updateGraphDto[key]) { // Simplifié, peut nécessiter une comparaison plus robuste pour les objets/tableaux
              changesMade = true;
              this.logger.debug(`Mise à jour du champ '${key}' pour ${idgraph}`);

               // --- Assignation des valeurs ---
               if (key === 'colonnesEtiquettes') {
                    // Directement assigner le tableau ou null (validé par le DTO)
                    graph.colonnesEtiquettes = updateGraphDto.colonnesEtiquettes as ColonneEtiquetteConfig[] | null;
               } else if (key === 'configGeographique') {
                    // Directement assigner l'objet ou null (validé par le DTO)
                    graph.configGeographique = updateGraphDto.configGeographique as ConfigGeographique | null;
               } else if (key === 'metaDonnees') {
                   // Gérer la fusion si nécessaire ou remplacer (ici on remplace)
                    graph.metaDonnees = updateGraphDto.metaDonnees; // Assumes MetaDonneesDto is compatible or null
               } else if (key === 'titremetaDonnees') {
                    // Remplacer l'objet ou le mettre à null
                    graph.titremetaDonnees = updateGraphDto.titremetaDonnees;
               } else if (key === 'colonneX') {
                    // Remplacer (le type 'any' est hérité, validation DTO limitée)
                    graph.colonneX = updateGraphDto.colonneX;
               } else if (key === 'colonneY') {
                   // Remplacer le tableau (DTO valide la structure interne)
                    graph.colonneY = updateGraphDto.colonneY as any[] | null; // Utiliser le type correct de votre entité
               } else if (key === 'couleurY') {
                  // Gérer spécifiquement la mise à jour de metaDonnees.couleurs.specifiques
                   // Assurez-vous que la logique ci-dessous est correcte et nécessaire
                   // *** Attention : Ne mettez pas à jour directement graph[key] ici ***
               }
               // --- Gérer tous les autres champs SIMPLES ---
               else if (key !== 'couleurY') { // Évite d'assigner 'couleurY' directement à l'entité
                  // Vérifie si la clé existe bien sur l'entité Graph pour éviter les erreurs
                  if (key in graph) {
                      graph[key] = updateGraphDto[key];
                  } else {
                       this.logger.warn(`Propriété '${key}' non trouvée sur l'entité Graph. Ignorée.`);
                  }
               }
           }
      }
  }

   // --- 3. Traitement SPÉCIFIQUE pour 'couleurY' (Modification de metaDonnees.couleurs.specifiques) ---
   // Doit être fait APRÈS avoir potentiellement mis à jour graph.colonneY via le DTO
   if (updateGraphDto.couleurY && Array.isArray(updateGraphDto.couleurY) && updateGraphDto.couleurY.length > 0) {
        this.logger.log(`Application MAJ ciblées (couleurY) pour ${idgraph}`);

        // S'assurer que colonneY existe pour déterminer la taille et valider les noms
        if (!graph.colonneY || !Array.isArray(graph.colonneY) || graph.colonneY.length === 0) {
             this.logger.warn(`Données colonneY manquantes ou vides pour la mise à jour ciblée de couleurY sur ${idgraph}. Opération ignorée.`);
             // Ne pas lancer d'erreur ici, juste ignorer cette partie de la mise à jour
        } else {
             const currentColonneY = graph.colonneY as {colonne: string}[]; // Ajuster le type si nécessaire
             const nbY = currentColonneY.length;

              // Préparer graph.metaDonnees et les couleurs spécifiques
             if (!graph.metaDonnees) {
                 graph.metaDonnees = { couleurs: { specifiques: new Array(nbY).fill(null) } };
             } else if (!graph.metaDonnees.couleurs) {
                  graph.metaDonnees.couleurs = { specifiques: new Array(nbY).fill(null) };
             } else if (!graph.metaDonnees.couleurs.specifiques || !Array.isArray(graph.metaDonnees.couleurs.specifiques)) {
                 graph.metaDonnees.couleurs.specifiques = new Array(nbY).fill(null);
             }

             // S'assurer que le tableau specifiques a la bonne taille
             let specifiques = graph.metaDonnees.couleurs.specifiques;
             while (specifiques.length < nbY) { specifiques.push(null); }
             if (specifiques.length > nbY) { specifiques = specifiques.slice(0, nbY); }

              let specifiquesModified = false;
              for (const updateItem of updateGraphDto.couleurY) {
                   // Utiliser indexY fourni (supposé être 0-based maintenant ou ajuster la conversion)
                   // Assumons indexY est 0-based comme dans le DTO suggéré plus tôt
                   const internalIndex = updateItem.indexY;
                   const providedName = updateItem.colonne; // Correction: Utilise le nom de la propriété DTO
                   const newCouleur = updateItem.couleur;

                    // Validation de l'index INTERNE
                   if (internalIndex >= 0 && internalIndex < nbY) {
                       const actualColonneNameAtIndex = currentColonneY[internalIndex]?.colonne;

                        // Validation optionnelle mais recommandée du nom
                        if (actualColonneNameAtIndex === providedName) {
                            if (newCouleur !== undefined && specifiques[internalIndex] !== newCouleur) {
                                specifiques[internalIndex] = newCouleur;
                                specifiquesModified = true;
                                this.logger.debug(`MAJ Couleur specifique[${internalIndex}] (Nom:"${providedName}") à ${newCouleur}`);
                            }
                            // Gérer 'legende' si nécessaire
                        } else {
                            this.logger.warn(`Incohérence pour ${idgraph}: L'index ${internalIndex} contient "${actualColonneNameAtIndex}", mais le nom "${providedName}" a été fourni pour couleurY. MAJ couleur ignorée.`);
                        }
                   } else {
                        this.logger.warn(`Index ${internalIndex} invalide pour couleurY sur ${idgraph}. Ignoré. (Nb Séries Y: ${nbY})`);
                   }
              }

             // Réassigner uniquement si des modifications ont eu lieu
             if (specifiquesModified) {
                  graph.metaDonnees.couleurs.specifiques = specifiques;
                  changesMade = true; // Marquer qu'une sauvegarde est nécessaire
             }
         }
   }


  // --- Sauvegarde UNIQUEMENT si des changements ont été détectés ---
  if (!changesMade) {
       this.logger.log(`Aucune modification détectée pour ${idgraph}, pas de sauvegarde nécessaire.`);
        // Retourner le graphique original formaté (évite une écriture BDD inutile)
        if (!graph.sources?.fichier) { this.logger.warn(`Fichier manquant sur ${idgraph} (non sauvegardé).`); }
       return formatGraphResponse(graph); // Assurez-vous que formatGraphResponse existe et est importée
  }

  try {
      this.logger.log(`Sauvegarde des modifications pour ${idgraph}`);
      // save() met à jour l'entité 'graph' existante avec les nouvelles valeurs
      const savedGraph = await this.graphRepository.save(graph);
      this.logger.log(`Graphique ${idgraph} sauvegardé avec succès.`);

       // Utiliser l'entité retournée par save() pour le formatage
       if (!savedGraph.sources?.fichier) {
          
            this.logger.warn(`Relation 'sources' non chargée après sauvegarde pour ${idgraph}. Rechargement peut être nécessaire pour formatage.`);
           const reloadedGraph = await this.findOne(idgraph); // Recharger SEULEMENT SI NÉCESSAIRE
           return formatGraphResponse(reloadedGraph);
       }
      return formatGraphResponse(savedGraph); // Utilise l'entité sauvegardée

  } catch (error) {
      this.logger.error(`Erreur lors de la sauvegarde (update) ${idgraph}: ${error.message}`, error.stack);
      // Remonter une erreur plus spécifique si possible (ex: validation échoue)
      if (error instanceof QueryFailedError) {
           throw new HttpException(`Erreur de base de données lors de la mise à jour: ${error.message}`,800);
      }
      throw new HttpException('Erreur interne serveur lors de la sauvegarde de la mise à jour.', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}



  async softDelete(id: string): Promise<void> {
    const graph = await this.findOne(id);
    await this.graphRepository.softRemove(graph);
  }

  async getGraphByProject(idprojet: string): Promise<FormattedGraphResponse[]> { // Type de retour corrigé
    let graphs: Graph[];
    try {
        graphs = await this.graphRepository
            .createQueryBuilder("graph")
            .leftJoinAndSelect("graph.sources", "source")
            .leftJoin("source.enquete", "enquete")
            .leftJoin("enquete.projet", "projet")
            .where("projet.idprojet = :idprojet", { idprojet })
            .getMany(); 

    } catch (error) {

        throw new HttpException(`Erreur BDD lors de la récupération des graphiques du projet ${idprojet}: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
        // Appliquer le formatage à chaque graphique récupéré
        return graphs.map(graph => {
            const formatted = formatGraphResponse(graph);
            if (formatted && typeof formatted === 'object' && 'error' in formatted) {
                console.error(`Échec du formatage pour ${graph.idgraph} (projet ${idprojet}): ${formatted.error}`);
                throw new Error(`Échec du formatage pour le graphique ${graph.idgraph}`);
            }
            // Il est raisonnable d'utiliser 'as' ici si on a géré l'erreur
            return formatted as FormattedGraphResponse;
        });
        // Si on retournait null en cas d'erreur : .filter(g => g !== null);

    } catch(formatError) {
         // Attraper les erreurs inattendues pendant le map/formatGraphResponse
         throw new HttpException(`Erreur lors du formatage des graphiques: ${formatError.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}


  async getGraphByProjectInStudio(idprojet: string): Promise<FormattedGraphResponse[]> { // Type de retour corrigé
    let graphs: Graph[];
    try {
        graphs = await this.graphRepository
            .createQueryBuilder("graph")
            .leftJoinAndSelect("graph.sources", "source") 
            .leftJoin("source.enquete", "enquete")
            .leftJoin("enquete.projet", "projet")
            .where("projet.idprojet = :idprojet", { idprojet })
            .andWhere("graph.inStudio = true") 
        
            .getMany();

    } catch (error) {
        // Gérer les erreurs BDD
        throw new HttpException(`Erreur BDD récupération graphiques InStudio pour projet ${idprojet}: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Bloc try...catch séparé pour l'étape de formatage
    try {
        // Appliquer le formatage à chaque graphique récupéré
        return graphs.map(graph => {
            const formatted = formatGraphResponse(graph);
            // Vérifier si le formatage a explicitement retourné une erreur
            if (formatted && typeof formatted === 'object' && 'error' in formatted) {
                console.error(`Échec formatage InStudio pour ${graph.idgraph} (projet ${idprojet}): ${formatted.error} / ${formatted.errorNote}`);
                // Gérer l'erreur de formatage (lancer, retourner null, retourner partiel)
                // Ici, on lance une exception pour l'exemple
                throw new Error(`Échec du formatage pour le graphique InStudio ${graph.idgraph}`);
            }
            return formatted as FormattedGraphResponse;
        });
    } catch (formatError) {
        // Attraper les erreurs pendant le map ou une erreur lancée ci-dessus
         throw new HttpException(`Erreur lors du formatage des graphiques InStudio: ${formatError.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
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












// --- Méthode mise à jour ---
  async generateGeoJsonForGraph(graphId: string): Promise<FeatureCollection> {
  // this.logger.log(`Début génération GeoJSON pour graph ID: ${graphId}`);

  // Étape 1: Récupérer l'entité Graphique complète
  const graph = await this.findOneById(graphId); // Utilise votre méthode interne
  if (!graph) {
      // Si le graphique lui-même n'existe pas -> 404 Not Found
      throw new NotFoundException(`Graphique avec l'ID ${graphId} introuvable.`);
  }

  // --- Branchement logique basé sur le type de graphique ---

  // CAS 1: Carte importée (données dans graph.geoJsonData)
  if (graph.typeGraphique === typegraphiqueEnum.CARTE_IMPORTEE) {

    if (graph.geoJsonData && typeof graph.geoJsonData === 'object' && graph.geoJsonData.type) {
        return graph.geoJsonData as FeatureCollection; 
    } else {
        // Si les données attendues pour ce type sont manquantes ou invalides -> Erreur
        console.error(`Données GeoJSON manquantes ou invalides pour CARTE_IMPORTEE ${graphId}.`);
        // Une ressource essentielle (les données GeoJSON) est manquante pour ce graphique spécifique
        throw new NotFoundException(`Données GeoJSON essentielles introuvables ou invalides pour le graphique importé ${graphId}.`);
    }
  }

  // CAS 2: Cartes basées sur l'extraction (Points, Lignes, Polygones)
  const extractionMapTypes = [
      typegraphiqueEnum.CARTE_POINTS,
      typegraphiqueEnum.CARTE_POLYGONE,
      typegraphiqueEnum.CARTE_LIGNE
  ];

  if (extractionMapTypes.includes(graph.typeGraphique)) {
    // this.logger.log(`Graphique ${graphId} est de type extraction (${graph.typeGraphique}). Validation de la configuration.`);

    // Étape 3: Valider config géo (spécifique à l'extraction)
    if (!graph.configGeographique || !graph.configGeographique.typeGeometrie || !graph.configGeographique.feuille) {
        // Configuration invalide ou manquante fournie par l'utilisateur/config -> 400 Bad Request
        throw new BadRequestException(`Configuration géographique (configGeographique) invalide ou incomplète pour le graphique ${graphId}. Champs 'typeGeometrie' et 'feuille' requis.`);
    }

    // Étape 4: Obtenir ID Source
    const sourceDonneeId = graph.sourcesIdsourceDonnes;
    if (!sourceDonneeId) {
        // Le lien vers la source est manquant dans le graphique -> Peut être considéré comme 404 ou 500 (intégrité data)
        throw new NotFoundException(`Aucun ID de source de données associé au graphique ${graphId}.`);
    }

    // Étape 5: Récupérer entité Source (via le service injecté)
    const sourceDonnee = await this.sourceDonneesservice.findOneById(sourceDonneeId);
    if (!sourceDonnee) {
        // La source liée n'existe plus -> 404 Not Found
        throw new NotFoundException(`Source de données (ID: ${sourceDonneeId}) associée au graphique ${graphId} introuvable.`);
    }

    // Étape 6: Accéder et valider données brutes dans la source
    const sourceDataContainer :any = sourceDonnee.fichier || sourceDonnee.bd_normales;

    const nomGroupe = graph.configGeographique.feuille;
    // console.log(sourceDataContainer.fichier.length())

    if (!sourceDataContainer || typeof sourceDataContainer !== 'object' || !sourceDataContainer[nomGroupe]) {
        // Les données brutes spécifiques nécessaires (la "feuille") sont manquantes dans la source -> 404 Not Found
        throw new NotFoundException(`Données sources (groupe/feuille '${nomGroupe} ') introuvables ou invalides dans la source ID ${sourceDonneeId} pour le graphique ${graphId}.`);
    }


    

    // Étape 7: Appeler GeoService pour générer le GeoJSON
    try {
        // this.logger.log(`Appel de GeoService.createGeoJsonData pour ${graphId}`);
        const geoJsonResult: FeatureCollection = this.geoService.createGeoJsonData(
          sourceDataContainer, // Passe uniquement les données de la feuille concernée
            graph.configGeographique,
            graph.colonnesEtiquettes || [],
            graph.idgraph
        );
    
        return geoJsonResult;

    } catch (error) {
        console.error(`Erreur lors de l'appel à GeoService pour ${graphId}:`, error);
        if (error instanceof HttpException) {
            // Si GeoService lance une HttpException (ex: Bad Request pour config invalide), la propager
            throw error;
        }
        // Pour les erreurs inattendues de GeoService -> 500 Internal Server Error
        throw new InternalServerErrorException(`Erreur interne lors de la transformation des données géospatiales pour le graphique ${graphId}.`);
    }
  }

  throw new BadRequestException(`Le type de graphique '${graph.typeGraphique}' (ID: ${graphId}) ne supporte pas la génération de données GeoJSON via cette route.`);

  }






// async createMapFromFile(idsource: string, dto: ImportMapFileDto, file: Express.Multer.File): Promise<any> {
//   const source = await this.sourceDonneesservice.getSourceById(idsource);
//   if (!source) {
//       throw new NotFoundException(`Source de données avec ID "${idsource}" introuvable.`);
//   }

//   let geoJsonData: any;
//   const fileExt = '.' + file.originalname.split('.').pop()?.toLowerCase();

//   try {
//     switch (fileExt) {
//       case '.json':
//       case '.geojson':
//         geoJsonData = JSON.parse(file.buffer.toString('utf-8'));
//         break;

//       case '.kml':
//         console.log(`Traitement du fichier ${fileExt}...`);
//         // Import dynamique de togeojson
//         const togeojsonKml = await import('@tmcw/togeojson');
//         const kmlDom = new DOMParser().parseFromString(file.buffer.toString('utf-8'), 'text/xml');
//         // Utilisation de la fonction kml du module importé
//         geoJsonData = togeojsonKml.kml(kmlDom);
//         break;

//       case '.kmz':
//          console.log(`Traitement du fichier ${fileExt}...`);
//          // Import dynamique de togeojson
//          const togeojsonKmz = await import('@tmcw/togeojson');
//          const zipKmz = new AdmZip(file.buffer); // AdmZip est importé statiquement
//          const kmlEntry = zipKmz.getEntries().find(entry => entry.entryName.toLowerCase().endsWith('.kml'));
//          if (!kmlEntry) throw new Error("Aucun fichier .kml trouvé dans l'archive KMZ.");
//          const kmlContent = kmlEntry.getData().toString('utf-8');
//          const kmzDom = new DOMParser().parseFromString(kmlContent, 'text/xml'); // DOMParser est statique
//          // Utilisation de la fonction kml du module importé
//          geoJsonData = togeojsonKmz.kml(kmzDom);
//          break;

//          case '.zip': // Assume Shapefile - Nouvelle logique avec le package 'shapefile'
//            console.log(`Traitement du fichier ${fileExt} avec le package 'shapefile'...`);

//            let shpBuffer: Buffer | null = null;
//            let dbfBuffer: Buffer | null = null;
//            let prjBuffer: Buffer | null = null; // Optionnel mais utile pour la projection

//            try {
//                const receivedZip = new AdmZip(file.buffer);
//                const zipEntries = receivedZip.getEntries();

//                // Chercher les fichiers nécessaires (à la racine ou dans un sous-dossier)
//                const findFileEntry = (extension: string): AdmZip.IZipEntry | undefined => {
//                     const extLower = extension.toLowerCase();
//                     // Priorité à la racine
//                     let entry = zipEntries.find(e => !e.isDirectory && e.entryName.toLowerCase().endsWith(extLower) && !e.entryName.includes('/'));
//                     if (entry) return entry;
//                     // Sinon, chercher dans le premier sous-dossier trouvé contenant un .shp
//                     const nestedShpEntry = zipEntries.find(e => !e.isDirectory && e.entryName.toLowerCase().endsWith('.shp') && e.entryName.includes('/'));
//                     if (nestedShpEntry) {
//                         const directoryPath = nestedShpEntry.entryName.substring(0, nestedShpEntry.entryName.lastIndexOf('/') + 1);
//                          entry = zipEntries.find(e => !e.isDirectory && e.entryName.toLowerCase().endsWith(extLower) && e.entryName.startsWith(directoryPath));
//                          if (entry) return entry;
//                     }
//                     return undefined; // Non trouvé
//                };

//                const shpEntry = findFileEntry('.shp');
//                const dbfEntry = findFileEntry('.dbf');
//                const prjEntry = findFileEntry('.prj'); // Recherche du .prj

//                if (!shpEntry) throw new Error("Fichier .shp manquant dans l'archive ZIP.");
//                if (!dbfEntry) throw new Error("Fichier .dbf manquant dans l'archive ZIP (requis pour les attributs).");

//                shpBuffer = shpEntry.getData();
//                dbfBuffer = dbfEntry.getData();
//                if (prjEntry) {
//                    prjBuffer = prjEntry.getData();
//                    console.log("Fichier .prj trouvé, la projection pourrait être lue.");
//                } else {
//                    console.warn("Fichier .prj non trouvé. La projection par défaut (WGS84) sera assumée ou devra être gérée manuellement.");
//                }

//                console.log("Buffers .shp et .dbf extraits de l'archive ZIP.");

//            } catch (zipError) {
//                console.error("Erreur lors de l'extraction des composants Shapefile du ZIP:", zipError);
//                throw new Error(`Erreur lors de l'extraction du Shapefile: ${zipError.message}`);
//            }

//            // Utiliser le package 'shapefile' avec les buffers extraits
//            if (shpBuffer && dbfBuffer) {
//                try {
//                    // L'API shapefile.read attend le nom du fichier .shp et .dbf, mais accepte aussi les buffers
//                    // La conversion en GeoJSON est implicite
//                    console.log("Lecture des buffers avec shapefile.read...");
//                    geoJsonData = await shapefile.read(shpBuffer, dbfBuffer /*, prjBuffer */); // Passer prjBuffer si disponible et supporté par l'API pour lire la projection
//                    console.log("Lecture Shapefile et conversion GeoJSON réussies.");
//                } catch (readError) {
//                    console.error("Erreur lors de la lecture des buffers par le package 'shapefile':", readError);
//                    throw new Error(`Erreur lors de la lecture du Shapefile: ${readError.message}`);
//                }
//            } else {
//               // Ne devrait pas arriver si les erreurs précédentes sont bien gérées
//               throw new Error("Les buffers SHP ou DBF n'ont pas pu être extraits correctement.");
//            }
//            break;

//       default:
//         throw new BadRequestException(`Extension de fichier non supportée: ${fileExt}`);
//     }

//     // ... (Validation GeoJSON) ...
//     if (!geoJsonData /* ... conditions ... */) {
//        throw new Error("Le fichier converti n'est pas un GeoJSON valide ou est vide.");
//     }
//     console.log(`Conversion en GeoJSON réussie. Type: ${geoJsonData.type}`);

//     // ... (Validation colonnesEtiquettes) ...

//   } catch (error) {
//       console.error(`Erreur pendant la conversion/validation (${fileExt}):`, error);
//       if (error instanceof HttpException) throw error;
//       throw new BadRequestException(`Échec du traitement du fichier ${file.originalname}: ${error.message}`);
//   }

//   // ... (Calcul de l'ordre) ...
//   const existingGraphCount = await this.graphRepository.countBy({ sourcesIdsourceDonnes: idsource });
//   const nextOrder = existingGraphCount + 1;

//   // ... (Création de graphDataToSave) ...
//   const graphDataToSave: Partial<Graph> = {
//       titreGraphique: dto.titreGraphique,
//       typeGraphique: typegraphiqueEnum.CARTE_IMPORTEE,
//       inStudio: false,
//       colonneX: null,
//       colonneY: null,
//       configGeographique: null,
//       geoJsonData: geoJsonData, // Stocker le GeoJSON
//       colonnesEtiquettes: dto.colonnesEtiquettes || null,
//       nomsourceDonnees: source.nomSource,
//       sources: source,
//       sourcesIdsourceDonnes: source.idsourceDonnes,
//       metaDonnees: null,
//       titremetaDonnees: null,
//       ordre: nextOrder,
//   };

//   const newGraph = this.graphRepository.create(graphDataToSave);

//   // ... (Sauvegarde et formatage) ...
//   try {
//       const savedGraph = await this.graphRepository.save(newGraph);
//       // ... (Fetch pour formatage) ...
//       const graphToFormat = await this.graphRepository.findOne({ where: { idgraph: savedGraph.idgraph }, relations: ['sources'] });
//       if (!graphToFormat) throw new NotFoundException("Graphique importé créé mais non retrouvé.");

//       return formatGraphResponse(graphToFormat);
//   } catch (dbError) {
//        console.error("Erreur DB (Graph) ou formatage:", dbError);
//        throw new InternalServerErrorException("Impossible de sauvegarder ou formater le graphique importé.");
//   }
// }




// deleted graph
// async softDeleteGraphs(ids: string[], user: any) {
//  if (user.role === UserRole.Client) {
//       throw new HttpException("Seul le superAdmin peut supprimer un projet", 701);
//     }

//   if (!ids || ids.length === 0) {
//     throw new HttpException('Aucun id passé en paramètre', 702);
//   }
//   try {
//     const notFoundIds: string[] = [];
//     let nbdelete = 0;

//     for (const id of ids) {
//       const graph = await this.graphRepository.findOne({ where: { idgraph: id  } });

//       if (!graph) {
//         notFoundIds.push(id);
//         continue;
//       }

//       await this.graphRepository.softDelete(id);
//       nbdelete++;
//     }

//     if (notFoundIds.length > 0) {
//       throw new HttpException(
//         `Les graphes suivants sont introuvables : ${notFoundIds.join(', ')}`,
//         703
//       );
//     }

//     return {
//       message: "Graphes supprimés avec succès.",
//       deletedCount: nbdelete,
//     };
//   } catch (err) {
//     if (err instanceof HttpException) throw err;
//     throw new HttpException(`Erreur lors du soft delete des graphes.`, HttpStatus.BAD_REQUEST);
//   }
// }


async createMapFromFile(idsource: string, dto: ImportMapFileDto, file: Express.Multer.File, existingGraphId?: string): Promise<any> {
  const source = await this.sourceDonneesservice.getSourceById(idsource);
  if (!source) {
    throw new NotFoundException(`Source de données avec ID "${idsource}" introuvable.`);
  }

  let geoJsonData: any;
  const fileExt = '.' + file.originalname.split('.').pop()?.toLowerCase();

  try {
    switch (fileExt) {
      case '.json':
      case '.geojson':
        geoJsonData = JSON.parse(file.buffer.toString('utf-8'));
        break;
      case '.kml':
        console.log(`Traitement du fichier ${fileExt}...`);
        const togeojsonKml = await import('@tmcw/togeojson');
        const kmlDom = new DOMParser().parseFromString(file.buffer.toString('utf-8'), 'text/xml');
        geoJsonData = togeojsonKml.kml(kmlDom);
        break;
      case '.kmz':
        console.log(`Traitement du fichier ${fileExt}...`);
        const togeojsonKmz = await import('@tmcw/togeojson');
        const zipKmz = new AdmZip(file.buffer);
        const kmlEntry = zipKmz.getEntries().find(entry => entry.entryName.toLowerCase().endsWith('.kml'));
        if (!kmlEntry) throw new Error("Aucun fichier .kml trouvé dans l'archive KMZ.");
        const kmlContent = kmlEntry.getData().toString('utf-8');
        const kmzDom = new DOMParser().parseFromString(kmlContent, 'text/xml');
        geoJsonData = togeojsonKmz.kml(kmzDom);
        break;
      case '.zip':
        console.log(`Traitement du fichier ${fileExt} avec le package 'shapefile'...`);
        const receivedZip = new AdmZip(file.buffer);
        const zipEntries = receivedZip.getEntries();
        const findFileEntry = (extension: string): AdmZip.IZipEntry | undefined => {
          const extLower = extension.toLowerCase();
          let entry = zipEntries.find(e => !e.isDirectory && e.entryName.toLowerCase().endsWith(extLower) && !e.entryName.includes('/'));
          if (!entry && zipEntries.some(e => e.entryName.toLowerCase().endsWith('.shp') && e.entryName.includes('/'))) {
            const directoryPath = zipEntries.find(e => e.entryName.toLowerCase().endsWith('.shp') && e.entryName.includes('/'))!.entryName.split('/')[0] + '/';
            entry = zipEntries.find(e => !e.isDirectory && e.entryName.toLowerCase().endsWith(extLower) && e.entryName.startsWith(directoryPath));
          }
          return entry;
        };
        const shpEntry = findFileEntry('.shp');
        const dbfEntry = findFileEntry('.dbf');
        const prjEntry = findFileEntry('.prj');
        if (!shpEntry || !dbfEntry) throw new Error("Fichiers .shp ou .dbf manquants dans l'archive ZIP.");
        const shpBuffer = shpEntry.getData();
        const dbfBuffer = dbfEntry.getData();
        const prjBuffer = prjEntry?.getData();
        geoJsonData = await shapefile.read(shpBuffer, dbfBuffer, prjBuffer);
        break;
      default:
        throw new BadRequestException(`Extension de fichier non supportée: ${fileExt}`);
    }

    if (!geoJsonData || !geoJsonData.type || geoJsonData.type !== 'FeatureCollection') {
      throw new Error("Le fichier converti n'est pas un GeoJSON valide ou est vide.");
    }
    console.log(`Conversion en GeoJSON réussie. Type: ${geoJsonData.type}`);

    let graphToUpdate: Graph | null = null;
    let importId = crypto.randomUUID(); // ID unique pour cette importation
    if (existingGraphId) {
      graphToUpdate = await this.graphRepository.findOne({ where: { idgraph: existingGraphId }, relations: ['sources'] });
      if (!graphToUpdate) {
        throw new NotFoundException(`Graphique avec ID "${existingGraphId}" introuvable.`);
      }
      if (graphToUpdate.typeGraphique !== typegraphiqueEnum.CARTE_IMPORTEE && !this.isGeospatialType(graphToUpdate.typeGraphique)) {
        throw new BadRequestException(`Le graphique existant (ID: ${existingGraphId}) n'est pas de type compatible pour une importation (CARTE_IMPORTEE ou géospatial).`);
      }

      // Récupérer le GeoJSON dynamique de la carte existante
      let existingGeoJson: FeatureCollection;
      if (graphToUpdate.typeGraphique === typegraphiqueEnum.CARTE_IMPORTEE && graphToUpdate.geoJsonData) {
        existingGeoJson = graphToUpdate.geoJsonData as FeatureCollection;
      } else if (this.isGeospatialType(graphToUpdate.typeGraphique)) {
        existingGeoJson = await this.generateGeoJsonForGraph(existingGraphId);
      } else {
        throw new BadRequestException("Type de graphique incompatible pour la fusion.");
      }

      // Fusionner avec le nouveau GeoJSON importé
      geoJsonData = this.mergeGeoJsonData(existingGeoJson, geoJsonData);

      // Mettre à jour l'historique des importations
      graphToUpdate.importHistory = graphToUpdate.importHistory || [];
      graphToUpdate.importHistory.push({ importId, timestamp: new Date(), fileName: file.originalname });
      // graphToUpdate.isHidden = false; // Décommenter si l'entité est mise à jour
    }

    const existingGraphCount = await this.graphRepository.countBy({ sourcesIdsourceDonnes: idsource });
    const nextOrder = existingGraphCount + 1;

    const graphDataToSave: Partial<Graph> = {
      titreGraphique: dto.titreGraphique || (graphToUpdate?.titreGraphique || `Carte importée ${nextOrder}`),
      typeGraphique: typegraphiqueEnum.CARTE_IMPORTEE,
      inStudio: false,
      colonneX: null,
      colonneY: null,
      configGeographique: null,
      geoJsonData: geoJsonData, // Stocker le résultat de la fusion
      colonnesEtiquettes: dto.colonnesEtiquettes || null,
      nomsourceDonnees: source.nomSource,
      sources: source,
      sourcesIdsourceDonnes: source.idsourceDonnes,
      metaDonnees: null,
      titremetaDonnees: null,
      ordre: nextOrder,
      isHidden: false,
      importHistory: graphToUpdate?.importHistory || [{ importId, timestamp: new Date(), fileName: file.originalname }],
    };

    const newGraph = this.graphRepository.create(graphDataToSave);

    try {
      const savedGraph = await this.graphRepository.save(newGraph);
      const graphToFormat = await this.graphRepository.findOne({ where: { idgraph: savedGraph.idgraph }, relations: ['sources'] });
      if (!graphToFormat) throw new NotFoundException("Graphique importé créé mais non retrouvé.");
      return formatGraphResponse(graphToFormat);
    } catch (dbError) {
      console.error("Erreur DB (Graph) ou formatage:", dbError);
      throw new InternalServerErrorException("Impossible de sauvegarder ou formater le graphique importé.");
    }
  } catch (error) {
    console.error(`Erreur pendant la conversion/validation (${fileExt}):`, error);
    if (error instanceof HttpException) throw error;
    throw new BadRequestException(`Échec du traitement du fichier ${file.originalname}: ${error.message}`);
  }
}

// Méthode pour fusionner les GeoJSON
private mergeGeoJsonData(existingGeoJson: FeatureCollection, newGeoJson: FeatureCollection): FeatureCollection {
  const mergedFeatures = [...(existingGeoJson.features || []), ...(newGeoJson.features || [])];
  return {
    type: 'FeatureCollection',
    features: mergedFeatures,
  };
}

// Méthode pour fusionner les GeoJSON
private mergeGeoJsonData(existingGeoJson: FeatureCollection, newGeoJson: FeatureCollection): FeatureCollection {
  const mergedFeatures = [...(existingGeoJson.features || []), ...(newGeoJson.features || [])];
  return {
    type: 'FeatureCollection',
    features: mergedFeatures,
  };
}


async deleteGraphs(ids: string[], user: any) {
  if (user.role === UserRole.Client) {
    throw new HttpException("Seul le superAdmin peut supprimer des graphiques", 701);
  }

  if (!ids || ids.length === 0) {
    throw new HttpException('Aucun id passé en paramètre', 702);
  }

  try {
    const notFoundIds: string[] = [];
    let nbdelete = 0;

    for (const id of ids) {
      const graph = await this.graphRepository.findOne({ where: { idgraph: id } });

      if (!graph) {
        notFoundIds.push(id);
        continue;
      }

      // Remplacement de softDelete par delete pour une suppression définitive
      await this.graphRepository.delete(id);
      nbdelete++;
    }

    if (notFoundIds.length > 0) {
      throw new HttpException(
        `Les graphes suivants sont introuvables : ${notFoundIds.join(', ')}`,
        703
      );
    }

    return {
      message: "Graphes supprimés définitivement avec succès.",
      deletedCount: nbdelete,
    };
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException(`Erreur lors de la suppression des graphes.`, HttpStatus.BAD_REQUEST);
  }
}
}


