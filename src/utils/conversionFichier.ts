
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';

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
    const rows: string[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    const sheetData = { donnees: [], colonnes: [] };
    if (rows.length > 0) {
      const headers = rows[0] as string[];
      const columnCount = headers.length;

      sheetData.colonnes = Array.from({ length: columnCount }, (_, j) => String.fromCharCode(65 + j));

      const headerRow = {};
      for (let j = 0; j < columnCount; j++) {
        const colKey = `${String.fromCharCode(65 + j)}1`;
        headerRow[colKey] = headers[j] || null;
      }
      sheetData.donnees.push(headerRow);

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowData = {};

        for (let j = 0; j < columnCount; j++) {
          const colKey = `${String.fromCharCode(65 + j)}${i + 1}`;
          rowData[colKey] = row[j] || null;
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
export async  function  processCsvFile(filePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const sheetData = { donnees: [], colonnes: [] };
    const stream = fs.createReadStream(filePath).pipe(csvParser());

    stream.on('headers', (headers) => {
      sheetData.colonnes = headers.map((_, j) => String.fromCharCode(65 + j));
      const headerRow = {};
      headers.forEach((header, j) => {
        headerRow[`${String.fromCharCode(65 + j)}1`] = header;
      });
      sheetData.donnees.push(headerRow);
    });

    stream.on('data', (row, index) => {
      const rowData = {};
      Object.values(row).forEach((value, j) => {
        rowData[`${String.fromCharCode(65 + j)}${index + 2}`] = value;
      });
      sheetData.donnees.push(rowData);
    });

    stream.on('end', () => resolve({ CSV: sheetData }));
    stream.on('error', (error) => reject(error));
  });
}


  //Charge un fichier JSON tel quel
 
export function processJsonFile(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}
  