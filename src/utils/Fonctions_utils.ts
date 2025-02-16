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
  

  export function extractColumnValuesWithFormula(colonnes: any[], fichier: any, colonneX: string[]): any[] {
    if (!fichier || typeof fichier !== "object") {
        console.error("ERREUR: `fichier` est invalide", fichier);
        return [];
    }

    return colonnes.map(item => {
        console.log(`📌 Traitement de la colonne:`, item);

        const feuille = fichier[item.nomFeuille];

        if (!feuille || !feuille.donnees) {
            console.error(`⚠ ERREUR: Feuille "${item.nomFeuille}" non trouvée.`);
            return { colonne: item.colonne, formule: item.formule, valeurs: [] };
        }

        const donnees = feuille.donnees;
        const colKey = item.colonne.replace(/\d+/g, ''); // Extraire la colonne sans chiffre

        console.log(`🛠 Clé de colonne extraite: ${colKey}`);

        // Obtenir le vrai nom de la colonne (ex: "B1" → "Mathématiques")
        const trueColumnName = donnees[0][`${colKey}1`] || item.colonne;
        console.log(`📌 Nom réel de la colonne : ${trueColumnName}`);

        // Création d'un dictionnaire { "Alice": [valeurs], "Bob": [valeurs] }
        const groupedValues: Record<string, number[]> = {};

        donnees.slice(1).forEach((row, index) => {
            // console.log(`🔍 Vérification ligne ${index + 2}:`, row);

            const studentName = row[`A${index + 2}`]; // Colonne A (nom de l'élève)
            const rawValue = row[`${colKey}${index + 2}`];

            // console.log(`👤 Élève détecté: ${studentName}, Valeur brute: ${rawValue}`);

            // Vérifier que la valeur est un nombre et éviter NaN
            const numericValue = !isNaN(parseFloat(rawValue)) ? parseFloat(rawValue) : 0;

            if (studentName) {
                if (!groupedValues[studentName]) {
                    groupedValues[studentName] = [];
                }
                groupedValues[studentName].push(numericValue);
            }
        });

        // Appliquer la fonction à chaque élève de colonneX
        const computedValues = colonneX.map(student => {
            const values = groupedValues[student] || [];

            if (values.length === 0) return 0;

            switch (item.formule) {
                case "somme":
                    return values.reduce((acc, val) => acc + val, 0);
                case "moyenne":
                    return values.reduce((acc, val) => acc + val, 0) / values.length;
                default:
                    return 0;
            }
        });

        
        return { colonne: trueColumnName, formule: item.formule, valeurs: computedValues };
    });
}




//---------------------- Formatage des réponses pour les graphes ---------------
// export function formatGraphResponse(graphs: Graph[]): any[] {
//     return graphs.map(graph => {
//         const source = graph.sources; // ✅ Vérifier bien la source de données
//         if (!source || !source.fichier) {
//             console.error(`⚠ ERREUR: Pas de fichier pour le graph ${graph.idgraph}`);
//             return graph; // Retourner l'objet brut si pas de fichier
//         }

//         return {
//             typeGraphique: graph.typeGraphique,
//             titreGraphique: graph.titreGraphique,
//             colonneX: extractColumnValues(graph.colonneX || [], source.fichier), // ✅ Suppression de `this`
//             colonneY: extractColumnValuesWithFormula(graph.colonneY || [], source.fichier), // ✅ Suppression de `this`
//         };
//     });
// }


export function formatGraphResponse(graph: Graph): any {
    if (!graph || !graph.sources || !graph.sources.fichier) {
        console.error(`⚠ ERREUR: Pas de fichier pour le graph ${graph.idgraph}`);
        return graph; 
    }

    const feuille = graph.sources.fichier["Sheet1"]; // Utilisation de la feuille principale
    const entetes = feuille.donnees[0]; // Première ligne (en-têtes)

    return {
        typeGraphique: graph.typeGraphique,
        titreGraphique: graph.titreGraphique,
        colonneX: graph.colonneX, 
        colonneY: graph.colonneY.map(col => ({
            colonne: entetes[col.colonne] || col.colonne, // Convertir "B1" en "Mathématiques"
            formule: col.formule,
            valeurs: (col as any).valeurs || []
        })),
    };
}





