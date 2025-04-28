import { typegraphiqueEnum } from "@/generique/cartes.enum";
import { Graph } from "src/graph/entities/graph.entity";

//------------------------ Extraction des valeurs pour le graphique ------------

export function extractColumnValues(colonnes: any[], fichier: any): any[] {
    if (!fichier || typeof fichier !== "object") {
      console.error("⚠ ERREUR: `fichier` est invalide", fichier);
      return [];
    }
  
    return colonnes.map(item => {
        const feuille = fichier[item.nomFeuille]; 
  
        if (!feuille || !feuille.donnees) {
            return { ...item, tabColonne: [] };
        }
  
        const donnees = feuille.donnees;
        const colKey = item.colonne.replace(/\d+/g, ''); 
  
        const values = donnees.slice(1)
            .map((row, index) => row[`${colKey}${index + 2}`]) 
            .filter(val => val !== undefined && val !== null);
  
        // Retourner les valeurs uniques si c'est un axe X
        return { ...item, tabColonne: [...new Set(values)] };
    });
  }
  

  export function extractColumnValuesWithFormula(
    colonnes: any[],
    fichier: any,
    colonneX: string[],
    colonneIdFromX: string // vient de colonneX[0].colonne
  ): any[] {
    if (!fichier || typeof fichier !== "object") {
      console.error("ERREUR: `fichier` est invalide", fichier);
      return [];
    }
  
    const idColKey = colonneIdFromX.replace(/\d+/g,''); // par exemple "B" si colonneIdFromX = "B1"
  
    return colonnes.map(item => {
      const feuille = fichier[item.nomFeuille];
  
      if (!feuille || !feuille.donnees) {
        console.error(` Feuille "${item.nomFeuille}" non trouvée.`);
        return { colonne: item.colonne, formule: item.formule, valeurs: [] };
      }
  
      const donnees = feuille.donnees;
      const colKey = item.colonne.replace(/\d+/g, '');
      const trueColumnName = donnees[0]?.[`${colKey}1`] || item.colonne;
  
      const groupedValues: Record<string, number[]> = {};
  
      donnees.slice(1).forEach((row, index) => {
        const numeroLigne = index + 2;
        const studentName = row[`${idColKey}${numeroLigne}`];
        const rawValue = row[`${colKey}${numeroLigne}`];
        const numericValue = !isNaN(parseFloat(rawValue)) ? parseFloat(rawValue) : 0;
  
        if (studentName) {
          if (!groupedValues[studentName]) {
            groupedValues[studentName] = [];
          }
          groupedValues[studentName].push(numericValue);
        }
      });
  
      const computedValues = colonneX.map(student => {
        const values = groupedValues[student] || [];
        if (values.length === 0) return 0;
  
        switch (item.formule) {
          case "somme":
            return values.reduce((acc, val) => acc + val, 0);
          case "moyenne":
            return values.reduce((acc, val) => acc + val, 0) / values.length;
          default:
            console.warn(`Formule "${item.formule}" non reconnue pour la colonne ${trueColumnName}.`);
            return 0;
        }
      });
  
      return { colonne: trueColumnName, formule: item.formule, valeurs: computedValues};
    });
  }
  



//graphique
  const defaultMetaDonnees = {
    sensEtiquette: "horizontal",
    positionEtiquette: "exterieure",
    axesSpecifies: { x: true, y: true },
    positionLegende: "haut",
    couleurs: {
      generiques: ["#4CAF50", "#8BC34A", "#FF9800"],
      specifiques: ["#4CAF50", "#8BC34A", "#FF9800"]
    }
  };
  
  function applyDefaultMetaDonnees(meta: any): any {
    const safeMeta = meta ?? {}; 
  
    return {
      ...defaultMetaDonnees,
      ...safeMeta,
      axesSpecifies: {
        ...defaultMetaDonnees.axesSpecifies,
        ...(safeMeta.axesSpecifies || {})
      },
      couleurs: {
        generiques: safeMeta?.couleurs?.generiques || defaultMetaDonnees.couleurs.generiques,
        specifiques: safeMeta?.couleurs?.specifiques || []
      }
    };
  }
  
  
  


 // Assurez-vous que le chemin est correct

// Définir une interface pour les éléments de colonneY pour plus de clarté (facultatif mais recommandé)
// Assurez-vous que cela correspond à la structure stockée dans graph.colonneY
// Basé sur votre code update et l'entité, cela semble être un tableau d'objets,
// mais la structure exacte utilisée AVANT formatage n'est pas explicitement définie dans le code fourni.
// On suppose ici une structure de base qui est ensuite enrichie.
interface InputColonneYItem {
    colonne: string; // Nom interne de la colonne (avant traduction par les entêtes)
    formule?: string;
    valeurs?: any[];
    couleur?: string; // Couleur potentiellement déjà définie directement (priorité 1)
    nomFeuille?: string | null; // Peut exister selon CreateGraphDto
    // Ajoutez d'autres champs si nécessaire depuis votre DTO ou structure de stockage
}

// Définir une interface pour la structure de retour (facultatif mais recommandé)
export interface FormattedGraphResponse {
    idgraph: string;
    typeGraphique: string; // Utiliser l'enum si possible typegraphiqueEnum
    titreGraphique: string;
    titremetaDonnees: { couleurTitre?: string; couleurFond?: string; } | null;
    colonneX: any | null; // Conservez le type de votre entité ou affinez-le
    colonneY: FormattedColonneYItem[];
    metaDonnees: any | null; // Conservez le type de votre entité ou affinez-le
    error?: string;
    errorNote?: string;

    geoData?: any | null;
    popupConfig?: any | null; 
    // Ajoutez d'autres champs retournés si nécessaire (ex: createdAt, updatedAt...)
}

interface FormattedColonneYItem {
    colonne: string; // Nom d'affichage de la colonne (potentiellement traduit)
    formule?: string;
    valeurs: any[];
    legende: string;
    couleur: string; // La couleur déterminée
}


function isClassicGraph(type: typegraphiqueEnum): boolean {
  // Liste exhaustive de vos types classiques
  return [
      typegraphiqueEnum.LIGNE,
      typegraphiqueEnum.BARRES,
      typegraphiqueEnum.BARRES_HORIZONTALES,
      typegraphiqueEnum.SECTEURS,
      typegraphiqueEnum.ANNEAU,
      typegraphiqueEnum.DISPERSION,
      typegraphiqueEnum.BULLES,
      typegraphiqueEnum.RADAR,
      typegraphiqueEnum.AIRE,
      typegraphiqueEnum.CHANDELIER
  ].includes(type);
}

function isExtractionMap(type: typegraphiqueEnum): boolean {
  // Liste des types de cartes basés sur l'extraction de données
  return [
      typegraphiqueEnum.CARTE_POINTS,
      typegraphiqueEnum.CARTE_POLYGONE,
      typegraphiqueEnum.CARTE_LIGNE,
  ].includes(type);
}

/**
 * Formate la réponse pour un graphique, en incluant les couleurs spécifiques
 * pour chaque série Y, en respectant une priorité définie.
 *
 * Important: Cette fonction suppose que l'objet `graph` en entrée, en particulier
 * `graph.metaDonnees.couleurs.specifiques`, a déjà été mis à jour
 * (par exemple, par la méthode `update`) AVANT d'appeler cette fonction.
 *
 * @param graph L'objet Graph complet (potentiellement après sauvegarde/mise à jour).
 * @returns Un objet formaté prêt à être envoyé au client, ou un objet d'erreur/partiel.
 */
export function formatGraphResponse(graph: Graph): FormattedGraphResponse | { error: string } | any {
  // --- Initial Check ---
  if (!graph) {
      console.error(`Graph non fourni pour formatage.`);
      return { error: "Graphique non trouvé" };
  }

  // --- Structure de base de la réponse (commune à tous les types) ---
  const baseResponse = {
      idgraph: graph.idgraph,
      typeGraphique: graph.typeGraphique,
      titreGraphique: graph.titreGraphique,
      titremetaDonnees: graph.titremetaDonnees,
      metaDonnees: graph.metaDonnees || {}, // Assure que metaDonnees n'est jamais undefined
      configGeographique: graph.configGeographique, // Pertinent pour extraction maps
      colonnesEtiquettes: graph.colonnesEtiquettes, // Pertinent pour les cartes
      createdAt: graph.createdAt,
      updatedAt: graph.updatedAt,
      inStudio: graph.inStudio,
      nomsourceDonnees: graph.nomsourceDonnees,
      sourcesIdsourceDonnes: graph.sourcesIdsourceDonnes,
      ordre: graph.ordre,
      // Initialisation des champs spécifiques au type
      colonneX: null,
      colonneY: null,
      geoData: null,
      popupConfig: null,
  };



  
  // --- Logique conditionnelle basée sur le type de graphique ---

  // ================================================================
  // == CAS 1: Graphiques Classiques ou Cartes par Extraction      ==
  // == (Nécessitent graph.sources.fichier pour le formatage de Y) ==
  // ================================================================
  if (isClassicGraph(graph.typeGraphique) || isExtractionMap(graph.typeGraphique)) {

      // --- Vérification des données sources (essentiel pour ce bloc) ---
      const hasSourceData = graph.sources && graph.sources.fichier;
      const nomsFeuilles = hasSourceData ? Object.keys(graph.sources.fichier) : [];
      const premiereFeuilleKey = nomsFeuilles.length > 0 ? nomsFeuilles[0] : null;
      const feuille = (hasSourceData && premiereFeuilleKey) ? graph.sources.fichier[premiereFeuilleKey] : null;
      // Vérification plus stricte : la feuille doit exister et contenir des données
      const hasValidSheetData = feuille && typeof feuille === 'object' && feuille.donnees && Array.isArray(feuille.donnees) && feuille.donnees.length > 0;

      // Extraction des en-têtes SEULEMENT si les données de la feuille sont valides
      const entetes = hasValidSheetData ? (feuille.donnees[0] || {}) : {};

      // --- Gestion des erreurs si les données sources sont invalides/manquantes ---
      if (!hasSourceData) {
          console.warn(`Sources ou fichier manquant pour graph ${graph.idgraph} (type: ${graph.typeGraphique}). Formatage partiel.`);
          return {
              ...baseResponse,
              colonneX: graph.colonneX, // Retourne brut
              colonneY: graph.colonneY || [], // Retourne brut comme fallback
              errorNote: "Données sources manquantes pour formatage détaillé.",
          };
      }
      if (!premiereFeuilleKey) {
           console.error(`Aucune feuille trouvée dans sources.fichier pour le graph ${graph.idgraph}.`);
           return {
               ...baseResponse,
               colonneX: graph.colonneX,
               colonneY: graph.colonneY || [],
               errorNote: "Aucune feuille de données trouvée",
           };
      }
       if (!hasValidSheetData) {
           console.error(`Données invalides/vides dans feuille '${premiereFeuilleKey}' pour graph ${graph.idgraph}.`);
           return {
               ...baseResponse,
               colonneX: graph.colonneX,
               colonneY: graph.colonneY || [],
               errorNote: "Données de feuille invalides ou vides",
           };
       }
      // --- Fin des vérifications des données sources ---


      // --- Formatage spécifique pour ces types ---
      let finalColonneX = graph.colonneX; // Par défaut, utilise la valeur brute
      let formattedColonneY: FormattedColonneYItem[] = [];
      const metaDonneesFromDb = baseResponse.metaDonnees; // Déjà extrait dans baseResponse
      const fallbackGenericColors = ["#4CAF50", "#8BC34A", "#FF9800", "#2196F3", "#9C27B0", "#FF5722", "#607D8B", "#E91E63"];


      if (isClassicGraph(graph.typeGraphique)) {
          // Formatage Colonne Y (VOTRE LOGIQUE ORIGINELLE EXACTE)
          if (Array.isArray(graph.colonneY)) {
              formattedColonneY = graph.colonneY.map((col: InputColonneYItem, index: number): FormattedColonneYItem => {
                  const internalColName = col.colonne;
                  const formule = col.formule;
                  const valeurs = col.valeurs || [];

                  // Détermination de la couleur (VOTRE LOGIQUE DE PRIORITÉ EXACTE)
                  const directColor = col.couleur;
                  const specificMetaColor = metaDonneesFromDb?.couleurs?.specifiques?.[index];
                  const genericColorsFromMeta = metaDonneesFromDb?.couleurs?.generiques;
                  const genericColors = Array.isArray(genericColorsFromMeta) && genericColorsFromMeta.length > 0
                      ? genericColorsFromMeta
                      : fallbackGenericColors;
                  const genericColor = genericColors[index % genericColors.length];
                  const finalColor = (directColor !== null && directColor !== undefined) ? directColor
                      : (specificMetaColor !== null && specificMetaColor !== undefined) ? specificMetaColor
                      : genericColor;

                  // Détermination du nom et légende (VOTRE LOGIQUE EXACTE)
                  const displayColonne = hasValidSheetData ? (entetes[internalColName] || internalColName) : internalColName;
                  const finalLegende = `${formule || ''} ${displayColonne || ''}`.trim();

                  return {
                      colonne: displayColonne,
                      formule: formule,
                      valeurs: valeurs,
                      legende: finalLegende,
                      couleur: finalColor
                  };
              });
          } else {
              console.warn(`graph.colonneY n'est pas un tableau pour ${graph.idgraph}. Retourne un tableau vide pour colonneY.`);
          }
      }
      else if (isExtractionMap(graph.typeGraphique)) {
          // Pour les cartes par extraction, les données brutes sont dans la source.
          // On pourrait extraire/transformer les données ici si nécessaire pour le front-end,
          // ou simplement signaler que la configuration est prête.
          // La logique principale de la carte se fera côté client avec configGeographique.
          finalColonneX = null; // Pas pertinent pour les cartes
          formattedColonneY = []; // Pas pertinent pour les cartes

          // On pourrait pré-traiter les données sources en GeoJSON ici si ce n'est pas déjà fait.
          // Pour l'instant, on suppose que le client utilisera configGeographique
          // pour interpréter graph.sources.fichier.
          // On peut générer le popupConfig ici basé sur les données sources et colonnesEtiquettes.
          try {
             baseResponse.popupConfig = processPopupConfig(graph.colonnesEtiquettes, feuille.donnees, entetes); // Traiter les données brutes
          } catch(popupError) {
              console.error(`Erreur lors du traitement popupConfig pour carte extraction ${graph.idgraph}:`, popupError);
          
          }

          // Potentiellement remplir geoData avec le GeoJSON extrait si on veut le pré-calculer
           // baseResponse.geoData = extractGeoJsonFromSource(graph.configGeographique, feuille.donnees); // Fonction hypothétique
      }

      // Retour pour Classique ou Carte par Extraction
      return {
          ...baseResponse,
          colonneX: finalColonneX,
          colonneY: formattedColonneY,
          // geoData et popupConfig auront été remplis si c'était une carte par extraction
      };
  }

  // ================================================================
  // == CAS 2: Cartes Importées (CARTE_IMPORTEE)                   ==
  // == (Données proviennent de graph.geoJsonData)                 ==
  // ================================================================
  else if (graph.typeGraphique === typegraphiqueEnum.CARTE_IMPORTEE) {
      console.log(`Formatage pour CARTE_IMPORTEE: ${graph.idgraph}`);
      let processedGeoData = null;
      let processedPopups = null;

      if (graph.geoJsonData) {
          processedGeoData = graph.geoJsonData; // Les données sont déjà au format GeoJSON
          // Traiter les popups en utilisant les données GeoJSON et la config
           try {
              // Utilise la version de processPopupConfig qui prend directement du GeoJSON
              processedPopups = processPopupConfigGeoJson(graph.colonnesEtiquettes, processedGeoData);
           } catch(popupError) {
                console.error(`Erreur lors du traitement popupConfig pour carte importée ${graph.idgraph}:`, popupError);
       
           }

      } else {
          console.error(`Données GeoJSON manquantes dans graph.geoJsonData pour CARTE_IMPORTEE ${graph.idgraph}.`);
       
      }

      // Retour pour Carte Importée
      return {
          ...baseResponse,
          colonneX: null, // Non pertinent
          colonneY: [], // Non pertinent
          geoData: processedGeoData, // Le GeoJSON stocké dans le graph
          popupConfig: processedPopups, // Les infos de popup traitées
      };
  }

  // ================================================================
  // == CAS 3: Type de graphique inconnu                           ==
  // ================================================================
  else {
      console.warn(`Type de graphique inconnu ou non géré dans le formateur: ${graph.typeGraphique} pour graph ${graph.idgraph}.`);
      return {
          ...baseResponse, // Retourne les infos de base
          error: "Type de graphique non supporté par le formateur",
      };
  }
}


// --- Fonction d'aide pour traiter les popups à partir de données tabulaires ---
// (Adaptée pour utiliser les données brutes et les en-têtes)
function processPopupConfig(etiquetteConfigs: any[] | null, donneesBrutes: any[] | null, entetes: { [key: string]: string }): any {
   if (!etiquetteConfigs || !donneesBrutes || donneesBrutes.length === 0) {
       return null; // Pas de config ou pas de données
   }

   // Inverse les entêtes pour trouver l'index par nom affiché si nécessaire,
   // mais ici on utilise directement la clé interne fournie dans etiquetteConfigs.colonne
   // const internalColNames = Object.keys(entetes);

   const featureData = donneesBrutes.map((row, index) => {
       const popupRow = {};
       etiquetteConfigs.forEach(config => {
           const internalColKey = config.colonne; // Clé interne (ex: "col_abc123")
           const displayName = entetes[internalColKey] || internalColKey; // Nom affiché (ex: "Nom Producteur")
           // Utilise la clé interne pour récupérer la valeur dans la ligne de données
           popupRow[displayName] = row[internalColKey] ?? 'N/A';
       });
       // Génère un ID simple si les lignes n'en ont pas
       return { id: `row_${index}`, properties: popupRow };
   });


   return {
       config: etiquetteConfigs,
       featureData: featureData // Structure similaire à celle pour GeoJSON pour cohérence
   };
}


// --- Fonction d'aide pour traiter les popups à partir de données GeoJSON ---
function processPopupConfigGeoJson(etiquetteConfigs: any[] | null, geojsonData: any): any {
  if (!etiquetteConfigs || !geojsonData ||
      (geojsonData.type !== 'FeatureCollection' && geojsonData.type !== 'Feature') ||
      (geojsonData.type === 'FeatureCollection' && !geojsonData.features)
     ) {
      return null; // Pas de config, pas de GeoJSON valide ou pas de features
  }

  const features = geojsonData.type === 'FeatureCollection' ? geojsonData.features : [geojsonData];
  if (!features || features.length === 0) {
      return null;
  }

  const popupData = {}; // Stocke les propriétés pour chaque feature par son ID

  features.forEach((feature, index) => {
      // Utilise l'ID du feature GeoJSON s'il existe, sinon en génère un basé sur l'index
      const featureId = feature.id ?? `feature_${index}`;
      const properties = feature.properties || {}; // Extrait les propriétés du feature
      const featurePopupProps = {};

      etiquetteConfigs.forEach(config => {
          const propertyName = config.colonne; // Le nom de la propriété GeoJSON à afficher
          // Le libellé à utiliser dans le popup est directement le nom de la propriété
           featurePopupProps[propertyName] = properties[propertyName] ?? 'N/A'; // Récupère la valeur
      });
      popupData[featureId] = featurePopupProps; // Assigne les propriétés traitées à l'ID du feature
  });

  return {
      config: etiquetteConfigs, // La configuration originale des étiquettes
      featureData: popupData   // Un objet où les clés sont les IDs des features et les valeurs sont les objets de propriétés formatées pour le popup
  };
}
  




