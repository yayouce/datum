import { Graph } from "src/graph/entities/graph.entity";


//------------------------extration des valeurs pour le graphique------------

export function extractColumnValues(colonnes: any[], fichier: any): any[] {
  // Vérifier si fichier est un objet et le transformer en tableau
  if (!Array.isArray(fichier)) {
      fichier = [fichier];
  }

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

export function extractColumnValuesWithFormula(colonnes: any[], fichier: any): any[] {
    // Vérifier si fichier est un objet et le transformer en tableau
    if (!Array.isArray(fichier)) {
        fichier = [fichier];
    }
  
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








  //---------------------- pour les reponses unifiés des graphes---------------
  export function formatGraphResponse(graphs: Graph[]): any[] {
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
  
  

