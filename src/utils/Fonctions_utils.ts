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
            console.error(`⚠ ERREUR: Feuille "${item.nomFeuille}" non trouvée.`);
            return { colonne: item.colonne, tabColonne: [] };
        }

        const donnees = feuille.donnees;
        const colKey = item.colonne.replace(/\d+/g, ''); // Extraire la lettre (ex: "A1" → "A")

        // Récupérer les valeurs uniques de la colonne X
        const values = Array.from(new Set(
            donnees.slice(1)
                .map((row, index) => row[`${colKey}${index + 2}`])
                .filter(val => val !== undefined && val !== null)
        ));

        return { colonne: item.colonne, tabColonne: values };
    }).filter(col => col.tabColonne.length > 0);
}


export function extractColumnValuesWithFormula(colonnes: any[], fichier: any, colonneX: any[]): any[] {
    if (!fichier || typeof fichier !== "object") {
        console.error("ERREUR: `fichier` est invalide", fichier);
        return [];
    }

    return colonnes.map(item => {
        const feuille = fichier[item.nomFeuille];
        if (!feuille || !feuille.donnees) {
            console.error(`⚠ ERREUR: Feuille "${item.nomFeuille}" non trouvée.`);
            return { colonne: item.colonne, fonction: item.fonction, valeurs: [0] };
        }

        const donnees = feuille.donnees;
        const colKey = item.colonne.replace(/\d+/g, ''); // Extraire la lettre (ex: "C1" → "C")

        // Créer une map { "Alice": [valeurs], "Bob": [valeurs] }
        const groupedValues: Record<string, number[]> = {};

        donnees.slice(1).forEach((row, index) => {
            const studentName = row[`A${index + 2}`]; // Colonne A (nom des élèves)
            const value = parseFloat(row[`${colKey}${index + 2}`]) || 0;

            if (studentName) {
                if (!groupedValues[studentName]) {
                    groupedValues[studentName] = [];
                }
                groupedValues[studentName].push(value);
            }
        });

        // Appliquer la fonction (somme ou moyenne) à chaque élève
        const computedValues = colonneX.map(student => {
            const values = groupedValues[student] || [0];

            if (item.fonction === "somme") {
                return values.reduce((acc, val) => acc + val, 0);
            } else if (item.fonction === "moyenne") {
                return values.length ? values.reduce((acc, val) => acc + val, 0) / values.length : 0;
            }

            return 0; // Valeur par défaut si aucun calcul n'est appliqué
        });

        return { colonne: item.colonne, fonction: item.fonction, valeurs: computedValues };
    }).filter(col => col.valeurs.some(val => val !== 0)); // Suppression des colonnes vides
}











export function processGraphData(colonneX: any[], colonnesY: any[], fichier: any): any {
    if (!fichier || typeof fichier !== "object") {
        console.error("ERREUR: `fichier` est invalide", fichier);
        return {};
    }

    let groupedData = {}; // Stockage des valeurs groupées par colonneX

    // Extraction et regroupement des valeurs de `colonneX`
    colonneX.forEach((xItem) => {
        const feuille = fichier[xItem.nomFeuille];
        if (!feuille || !feuille.donnees) return;

        const donnees = feuille.donnees;
        const xKey = xItem.colonne.replace(/\d+/g, ''); // Ex: "B1" → "B"
        const xValues = donnees.slice(1).map(row => row[`${xKey}${row.A2 ? row.A2 : ""}`]);

        colonnesY.forEach(yItem => {
            const yKey = yItem.colonne.replace(/\d+/g, '');
            const yValues = donnees.slice(1).map(row => parseFloat(row[`${yKey}${row.A2 ? row.A2 : ""}`]) || 0);

            xValues.forEach((xVal, i) => {
                if (!groupedData[xVal]) groupedData[xVal] = {};
                if (!groupedData[xVal][yItem.colonne]) groupedData[xVal][yItem.colonne] = [];
                groupedData[xVal][yItem.colonne].push(yValues[i]);
            });
        });
    });

    // Construction du format final du graphique
    let formattedGraph = {
        typeGraphique: "bar_chart",
        titreGraphique: "Génération Automatique de Graphique",
        colonneX: [],
        colonneY: []
    };

    Object.keys(groupedData).forEach(xVal => {
        formattedGraph.colonneX.push(xVal);
        
        colonnesY.forEach(yItem => {
            const values = groupedData[xVal][yItem.colonne] || [];
            let result = values;

            // Application des formules sur les valeurs agrégées
            switch (yItem.formule) {
                case "somme":
                    result = [values.reduce((acc, val) => acc + val, 0)];
                    break;
                case "moyenne":
                    result = [values.length ? values.reduce((acc, val) => acc + val, 0) / values.length : 0];
                    break;
                case "max":
                    result = [Math.max(...values)];
                    break;
                case "min":
                    result = [Math.min(...values)];
                    break;
            }

            let existingCol = formattedGraph.colonneY.find(col => col.colonne === yItem.colonne);
            if (existingCol) {
                existingCol.valeurs.push(result[0]);
            } else {
                formattedGraph.colonneY.push({
                    colonne: yItem.colonne,
                    fonction: yItem.formule,
                    valeurs: [result[0]]
                });
            }
        });
    });

    return formattedGraph;
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
