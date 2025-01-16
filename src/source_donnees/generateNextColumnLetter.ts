import { incrementColumnLetter } from "./incrementColumnLetter";

export function generateNextColumnLetter(columns: string[]): string {
    // Récupérer la dernière lettre de colonne existante
    const lastColumn = columns[columns.length - 1] || "A"; // Si aucune colonne, commencer par "A"
  
    // Générer la prochaine lettre de colonne
    return incrementColumnLetter(lastColumn);
  }
  