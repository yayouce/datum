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
  
    const idColKey = colonneIdFromX.replace(/\d+/g, ''); // par exemple "B" si colonneIdFromX = "B1"
  
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
  
      return { colonne: trueColumnName, formule: item.formule, valeurs: computedValues };
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
      specifiques: []
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
  
  
  


export function formatGraphResponse(graph: Graph): any {
    if (!graph || !graph.sources || !graph.sources.fichier) {
      console.error(`Pas de fichier pour le graph ${graph.idgraph}`);
      return graph;
    }
  
    const feuille = graph.sources.fichier["Sheet1"];
    const entetes = feuille.donnees[0];
    const metaDonnees = applyDefaultMetaDonnees(graph.metaDonnees);
  
    return {
      typeGraphique: graph.typeGraphique,
      titreGraphique: graph.titreGraphique,
      idgraph:graph.idgraph,
      titremetaDonnees:graph.titremetaDonnees,
      colonneX: graph.colonneX,
      colonneY: graph.colonneY.map((col, index) => ({
        colonne: entetes[col.colonne] || col.colonne,
        formule: col.formule,
        valeurs: (col as any).valeurs || [],
        legende: col.formule + " " + col.colonne,
        couleur: metaDonnees.couleurs.specifiques[index] || metaDonnees.couleurs.generiques[index % metaDonnees.couleurs.generiques.length]
      })),
      metaDonnees
    };
  }
  





