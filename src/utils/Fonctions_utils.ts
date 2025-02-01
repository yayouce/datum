export function extractColumnValues(colonnes: any[], fichier: any): any[] {
    if (!fichier || typeof fichier !== "object") {
        console.error("⚠ ERREUR: `fichier` est invalide", fichier);
        return []; // ✅ Retourne un tableau vide si `fichier` est mal formé
    }
  
    return colonnes.map(item => {
        const feuille = fichier[item.nomFeuille]; // ✅ Accès direct (fichier doit être un objet)
  
        if (!feuille || !feuille.donnees) {
            return { ...item, tabColonne: [] }; // ✅ Retourne un tableau vide si la feuille est absente
        }
  
        const donnees = feuille.donnees;
        const colKey = item.colonne.replace(/\d+/g, '');
  
        const values = donnees.slice(1).map((row, index) => row[`${colKey}${index + 2}`])
                                 .filter(val => val !== undefined && val !== null);
  
        return { ...item, tabColonne: values };
    });
  }
  