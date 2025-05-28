
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';
import { getExcelColumnName } from './generernomcolonne';

export function detectFileFormat(url: string): string {
  const extension = path.extname(url).toLowerCase().replace('.', '');
  return extension;
}


/**
 *  Convertit un fichier Excel en JSON formaté
 */
export function processExcelFile(filePath: string): any {
  const workbook = xlsx.readFile(filePath);
  const result = {};

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 }); // any[][] pour plus de flexibilité

    const sheetData = { donnees: [], colonnes: [] };
    if (rows.length > 0) {
      const headers = rows[0] as string[];
      const columnCount = headers.length;

      // Utiliser la nouvelle fonction pour générer les noms de colonnes
      sheetData.colonnes = Array.from({ length: columnCount }, (_, j) => getExcelColumnName(j));

      const headerRow = {};
      for (let j = 0; j < columnCount; j++) {
        // Utiliser la nouvelle fonction pour les clés
        const colKey = `${getExcelColumnName(j)}1`;
        headerRow[colKey] = headers[j] || null;
      }
      sheetData.donnees.push(headerRow);

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowData = {};

        // Assurez-vous que row est bien un tableau, sinon il faut adapter
        // Si row[j] n'est pas défini pour toutes les colonnes, on peut avoir des erreurs.
        // Il faut s'assurer que row a une valeur pour chaque colonne ou gérer l'absence.
        for (let j = 0; j < columnCount; j++) { // Itérer jusqu'à columnCount défini par les headers
          // Utiliser la nouvelle fonction pour les clés
          const colKey = `${getExcelColumnName(j)}${i + 1}`;
          rowData[colKey] = (row && row[j] !== undefined) ? row[j] : null; // Gérer les cellules vides/manquantes
        }
        sheetData.donnees.push(rowData);
      }
    }
    result[sheetName] = sheetData;
  }
  return result;
}

/**
   Convertit un fichier CSV en JSON formaté
 */
export async function processCsvFile(filePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const sheetData = { donnees: [], colonnes: [] };
    let rowIndex = 0; // Pour suivre l'index de ligne pour la clé de cellule (commence à 0 pour les données)

    const stream = fs.createReadStream(filePath).pipe(csvParser());

    stream.on('headers', (headers) => {
      // Utiliser la nouvelle fonction pour générer les noms de colonnes
      sheetData.colonnes = headers.map((_, j) => getExcelColumnName(j));
      const headerRow = {};
      headers.forEach((header, j) => {
        // Utiliser la nouvelle fonction pour les clés
        headerRow[`${getExcelColumnName(j)}1`] = header;
      });
      sheetData.donnees.push(headerRow);
    });

    stream.on('data', (row) => { // csv-parser ne fournit pas d'index directement dans 'data' pour la ligne
      const rowData = {};
      // Object.values(row) conserve l'ordre des colonnes tel que défini par les headers
      Object.values(row).forEach((value, j) => {
        // Utiliser la nouvelle fonction pour les clés. rowIndex + 2 car 1 est pour les headers.
        rowData[`${getExcelColumnName(j)}${rowIndex + 2}`] = value;
      });
      sheetData.donnees.push(rowData);
      rowIndex++;
    });

    stream.on('end', () => resolve({ CSV: sheetData }));
    stream.on('error', (error) => reject(error));
  });
}


  //Charge un fichier JSON tel quel
 
export function processJsonFile(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}
  