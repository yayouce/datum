import { HttpException } from "@nestjs/common";

export function getSheetOrDefault(fichier: any, sheetName?: string): any {
  if (Array.isArray(fichier)) {
    // Si fichier est un tableau
    const sheetObject = sheetName
      ? fichier.find((sheetObj) => sheetObj[sheetName])
      : fichier[0];
    if (!sheetObject) {
      throw new HttpException(
        `La feuille "${sheetName || 'première feuille'}" n'existe pas.`,
        803
      );
    }
    return sheetName ? sheetObject[sheetName] : Object.values(sheetObject)[0];
  } else if (typeof fichier === 'object') {
    // Si fichier est un objet
    const targetSheetName = sheetName || Object.keys(fichier)[0];
    const sheet = fichier[targetSheetName];
    if (!sheet) {
      throw new HttpException(
        `La feuille "${sheetName || 'première feuille'}" n'existe pas.`,
        803
      );
    }
    return sheet;
  } else {
    throw new HttpException(`Le fichier est mal formaté.`, 803);
  }
}
