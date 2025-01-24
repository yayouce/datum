import { HttpException } from "@nestjs/common";

export function getSheetOrDefault(fichier: any, sheetName?: string): any {
  if (typeof fichier !== "object" || fichier === null || Object.keys(fichier).length === 0) {
    throw new HttpException(`Le fichier est vide ou mal formaté.`, 803);
  }

  if (sheetName) {
    // Recherche de la feuille spécifiée par son nom
    if (!fichier[sheetName]) {
      throw new HttpException(`La feuille "${sheetName}" n'existe pas.`, 803);
    }
    return fichier[sheetName];
  } else {
    // Si aucune feuille n'est spécifiée, prendre la première feuille
    const firstSheetName = Object.keys(fichier)[0];
    if (!firstSheetName) {
      throw new HttpException(`Aucune feuille n'est disponible dans ce fichier.`, 803);
    }
    return fichier[firstSheetName];
  }
}
