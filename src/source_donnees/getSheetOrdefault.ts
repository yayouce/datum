import { HttpException } from "@nestjs/common";

export function getSheetOrDefault(fichier: any, sheetName?: string): any {
    if (sheetName) {
      if (!fichier[sheetName]) {
        throw new HttpException(`La feuille "${sheetName}" n'existe pas.`, 404);
      }
      return fichier[sheetName];
    } else {
      // Si aucune feuille n'est spécifiée, prendre la première feuille
      const sheetNames = Object.keys(fichier);
      if (sheetNames.length === 0) {
        throw new HttpException(`Aucune feuille n'est disponible dans ce fichier.`, 404);
      }
      return fichier[sheetNames[0]]; // Retourne la première feuille
    }
  }