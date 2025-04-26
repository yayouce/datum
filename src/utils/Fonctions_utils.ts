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
    // Ajoutez d'autres champs retournés si nécessaire (ex: createdAt, updatedAt...)
}

interface FormattedColonneYItem {
    colonne: string; // Nom d'affichage de la colonne (potentiellement traduit)
    formule?: string;
    valeurs: any[];
    legende: string;
    couleur: string; // La couleur déterminée
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
    // --- Initial Checks ---
    if (!graph) {
        console.error(`Graph non fourni pour formatage.`);
        // Retourne un objet d'erreur clair
        return { error: "Graphique non trouvé" };
    }

    // Vérifie si les sources et le fichier existent pour le formatage des colonnes Y
    const hasSourceData = graph.sources && graph.sources.fichier;
    const nomsFeuilles = hasSourceData ? Object.keys(graph.sources.fichier) : [];
    const premiereFeuilleKey = nomsFeuilles.length > 0 ? nomsFeuilles[0] : null;
    const feuille = premiereFeuilleKey ? graph.sources.fichier[premiereFeuilleKey] : null;
    const hasValidSheetData = feuille && feuille.donnees && Array.isArray(feuille.donnees) && feuille.donnees.length > 0;

    // Extraction des en-têtes SEULEMENT si les données de la feuille sont valides
    const entetes = hasValidSheetData ? (feuille.donnees[0] || {}) : {};

    // --- Get MetaDonnees from DB and Fallback Colors ---
    // Utilise les metaDonnees du graph fourni, qui DEVRAIENT être à jour
    const metaDonneesFromDb = graph.metaDonnees || {};
    const fallbackGenericColors = ["#4CAF50", "#8BC34A", "#FF9800", "#2196F3", "#9C27B0", "#FF5722", "#607D8B", "#E91E63"];

    // Structure de base de la réponse
    const baseResponse = {
        idgraph: graph.idgraph,
        typeGraphique: graph.typeGraphique,
        titreGraphique: graph.titreGraphique,
        titremetaDonnees: graph.titremetaDonnees,
        colonneX: graph.colonneX, // Suppose que colonneX est déjà dans le format attendu
        metaDonnees: metaDonneesFromDb, // Inclut les metaDonnees potentiellement mises à jour
        // Ajoutez ici d'autres champs de premier niveau si nécessaire (ex: createdAt, updatedAt, etc.)
        createdAt: graph.createdAt,
        updatedAt: graph.updatedAt,
        inStudio: graph.inStudio,
        configGeographique: graph.configGeographique,
        colonnesEtiquettes: graph.colonnesEtiquettes,
        nomsourceDonnees: graph.nomsourceDonnees,
        sourcesIdsourceDonnes: graph.sourcesIdsourceDonnes,
        ordre: graph.ordre
    };

    // --- colonneY formatting ---
    let formattedColonneY: FormattedColonneYItem[] = [];
    if (Array.isArray(graph.colonneY)) {
        formattedColonneY = graph.colonneY.map((col: InputColonneYItem, index: number): FormattedColonneYItem => {
            // Utilise l'interface InputColonneYItem pour accéder aux propriétés avec le type checking
            const internalColName = col.colonne; // Nom technique de la colonne
            const formule = col.formule;
            const valeurs = col.valeurs || []; // Fournit un tableau vide par défaut

            // --- Détermination de la couleur pour CETTE série Y (priorité) ---
            // 1. Couleur directement dans l'item colonneY (moins courant mais possible)
            const directColor = col.couleur;
            // 2. Couleur spécifique de metaDonnees (mise à jour par la méthode update)
            //    Utilise l'index pour faire correspondre la couleur à la série Y
            const specificMetaColor = metaDonneesFromDb?.couleurs?.specifiques?.[index];
            // 3. Couleurs génériques de metaDonnees (si pas de spécifique)
            const genericColorsFromMeta = metaDonneesFromDb?.couleurs?.generiques;
            // 4. Couleurs génériques de secours (si rien dans metaDonnees)
            const genericColors = Array.isArray(genericColorsFromMeta) && genericColorsFromMeta.length > 0
                ? genericColorsFromMeta
                : fallbackGenericColors;
            const genericColor = genericColors[index % genericColors.length]; // Cycle à travers les couleurs génériques

            // Applique la priorité pour choisir la couleur finale
            const finalColor = (directColor !== null && directColor !== undefined)
                ? directColor // Priorité 1
                : (specificMetaColor !== null && specificMetaColor !== undefined)
                    ? specificMetaColor // Priorité 2
                    : genericColor;     // Priorité 3/4

            // --- Détermination du nom d'affichage et de la légende ---
            // Utilise l'en-tête si trouvé, sinon le nom interne
            const displayColonne = hasValidSheetData ? (entetes[internalColName] || internalColName) : internalColName;

            // Construit la légende (ex: "somme Ventes" ou "moyenne Prix Unitaire")
            const finalLegende = `${formule || ''} ${displayColonne || ''}`.trim();

            // Retourne l'objet formaté pour cette colonne Y
            return {
                colonne: displayColonne, // Nom affichable
                formule: formule,
                valeurs: valeurs,
                legende: finalLegende,
                couleur: finalColor // La couleur déterminée est incluse ici
            };
        });
    } else {
        // Si graph.colonneY n'est pas un tableau, retourne un tableau vide
        console.warn(`graph.colonneY n'est pas un tableau pour ${graph.idgraph}. Retourne un tableau vide pour colonneY.`);
    }

    // --- Gestion des cas où les sources/données sont manquantes ---
    if (!hasSourceData) {
        console.warn(`Sources ou fichier manquant pour graph ${graph.idgraph}. Formatage partiel.`);
        // Retourne les données essentielles sans le formatage dépendant des sources
        return {
            ...baseResponse,
            colonneY: graph.colonneY || [], // Retourne les données brutes de colonneY comme fallback
          
        };
    }
    if (!premiereFeuilleKey) {
         console.error(`Aucune feuille trouvée dans sources.fichier pour le graph ${graph.idgraph}.`);
         return {
            ...baseResponse,
            colonneY: graph.colonneY || [],
            errorNote: "Aucune feuille de données trouvée",
         };
    }
     if (!hasValidSheetData) {
         console.error(`Données invalides/vides dans feuille '${premiereFeuilleKey}' pour graph ${graph.idgraph}.`);
         return {
             ...baseResponse,
             colonneY: graph.colonneY || [],
             errorNote: "Données de feuille invalides ou vides",
         };
     }

    // --- Retour final ---
    // Combine la base avec les colonnes Y formatées
    return {
        ...baseResponse,
        colonneY: formattedColonneY, // Utilise les colonnes Y formatées (qui incluent la couleur)
    };
}
  





