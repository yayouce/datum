import { HttpException } from "@nestjs/common";

export function getSheetOrDefault(fichier: any[], sheetName?: string): any {
  if (!Array.isArray(fichier) || fichier.length === 0) {
    throw new HttpException(`Le fichier est vide ou mal formaté.`, 803);
  }

  if (sheetName) {
    // Recherche de la feuille spécifiée par son nom
    const sheet = fichier.find(sheetObject => sheetObject[sheetName]);
    if (!sheet) {
      throw new HttpException(`La feuille "${sheetName}" n'existe pas.`, 803);
    }
    return sheet[sheetName];
  } else {
    // Si aucune feuille n'est spécifiée, prendre la première feuille
    const firstSheet = fichier[0];
    const firstSheetName = Object.keys(firstSheet)[0];
    if (!firstSheetName) {
      throw new HttpException(`Aucune feuille n'est disponible dans ce fichier.`, 803);
    }
    return firstSheet[firstSheetName];
  }
}
