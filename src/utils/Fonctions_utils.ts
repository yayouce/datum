import { Graph } from "src/graph/entities/graph.entity";

//------------------------ Extraction des valeurs pour le graphique ------------

export function extractColumnValues(colonnes: any[], fichier: any): any[] {
  // Vérifier que fichier est bien un objet JSON
  if (!fichier || typeof fichier !== "object") {
    console.error("⚠ ERREUR: `fichier` est invalide", fichier);
    return [];
  }

  return colonnes.map(item => {
      const feuille = fichier[item.nomFeuille]; // ✅ Accès direct (fichier doit être un objet)

      if (!feuille || !feuille.donnees) {
          return { ...item, tabColonne: [] }; // ✅ Retourne un tableau vide si la feuille est absente
      }

      const donnees = feuille.donnees;
      const colKey = item.colonne.replace(/\d+/g, ''); // Supprimer les chiffres pour extraire la colonne (ex: "B1" → "B")

      const values = donnees.slice(1) // Ignore la première ligne (entêtes)
          .map((row, index) => row[`${colKey}${index + 2}`]) // Ex: B2, B3, B4...
          .filter(val => val !== undefined && val !== null);

      return { ...item, tabColonne: values };
  });
}

export function extractColumnValuesWithFormula(colonnes: any[], fichier: any): any[] {
    // Vérifier que fichier est bien un objet JSON
    if (!fichier || typeof fichier !== "object") {
        console.error("ERREUR: `fichier` est invalide", fichier);
        return [];
    }

    return colonnes.map(item => {
        const feuille = fichier[item.nomFeuille];

        if (!feuille || !feuille.donnees) {
            return { ...item, tabColonne: [] }; // ✅ Retourne un tableau vide si la feuille est absente
        }

        const donnees = feuille.donnees;
        const colKey = item.colonne.replace(/\d+/g, ''); // Supprimer les chiffres pour extraire la colonne

        const values = donnees.slice(1)
            .map((row, index) => row[`${colKey}${index + 2}`])
            .filter(val => val !== undefined && val !== null);

        let computedValue = values;

        // Appliquer la formule demandée
        if (item.formule === "somme") {
            computedValue = [values.reduce((acc, val) => acc + (parseFloat(val) || 0), 0)];
        } else if (item.formule === "moyenne") {
            computedValue = [values.length ? values.reduce((acc, val) => acc + (parseFloat(val) || 0), 0) / values.length : 0];
        }

        return { ...item, tabColonne: computedValue };
    });
}

//---------------------- Formatage des réponses pour les graphes ---------------
export function formatGraphResponse(graphs: Graph[]): any[] {
    return graphs.map(graph => {
        const source = graph.sources; // ✅ Vérifier bien la source de données
        if (!source || !source.fichier) {
            console.error(`⚠ ERREUR: Pas de fichier pour le graph ${graph.idgraph}`);
            return graph; // Retourner l'objet brut si pas de fichier
        }

        return {
            typeGraphique: graph.typeGraphique,
            titreGraphique: graph.titreGraphique,
            colonneX: extractColumnValues(graph.colonneX || [], source.fichier), // ✅ Suppression de `this`
            colonneY: extractColumnValuesWithFormula(graph.colonneY || [], source.fichier), // ✅ Suppression de `this`
        };
    });
}
