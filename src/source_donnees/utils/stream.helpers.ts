import * as fs from 'fs';
import { Stream } from 'stream';
import axios from 'axios';
import * as csvParser from 'csv-parser';
import * as exceljs from 'exceljs';

// --- Types pour la structure de données interne ---
type ExcelRowData = Record<string, any>;
type SheetData = {
  colonnes: string[];
  donnees: ExcelRowData[];
};
type FichierData = Record<string, SheetData>;

/**
 * Génère un nom de colonne Excel (A, B, ..., Z, AA, AB, ...) à partir d'un index base 0.
 * @param index L'index de la colonne (0 pour A, 1 pour B, etc.).
 */
function getExcelColumnName(index: number): string {
  let name = '';
  let i = index;
  do {
    name = String.fromCharCode(i % 26 + 65) + name;
    i = Math.floor(i / 26) - 1;
  } while (i >= 0);
  return name;
}

/**
 * Télécharge un fichier depuis une URL en utilisant un stream pour éviter de le charger en mémoire.
 * @param url L'URL du fichier à télécharger.
 * @param outputPath Le chemin complet où sauvegarder le fichier.
 */
export function downloadFileAsStream(url: string, outputPath: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'stream',
        timeout: 180000,
      });

      const writer = fs.createWriteStream(outputPath);
      const stream = response.data as Stream;

      stream.pipe(writer);

      writer.on('finish', resolve);
      writer.on('error', reject);
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Lit un fichier CSV en utilisant un stream et le transforme dans la structure de données attendue.
 * @param filePath Le chemin du fichier CSV.
 */
export async function processCsvStream(filePath: string): Promise<FichierData> {
  return new Promise((resolve, reject) => {
    const results: Record<string, any>[] = [];
    let headers: string[] = [];

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('headers', (headerList: string[]) => {
        headers = headerList;
      })
      .on('data', (data: Record<string, any>) => results.push(data))
      .on('end', () => {
        const colonnes = headers.map((_, index) => getExcelColumnName(index));

        const headerRow: ExcelRowData = {};
        headers.forEach((header, index) => {
          headerRow[`${colonnes[index]}1`] = header;
        });

        const dataRows: ExcelRowData[] = results.map((row, rowIndex) => {
          const excelRow: ExcelRowData = {};
          headers.forEach((header, colIndex) => {
            const cellKey = `${colonnes[colIndex]}${rowIndex + 2}`;
            excelRow[cellKey] = row[header];
          });
          return excelRow;
        });

        const fichierFinal: FichierData = {
          Sheet1: {
            colonnes,
            donnees: [headerRow, ...dataRows],
          },
        };
        resolve(fichierFinal);
      })
      .on('error', (error) => reject(error));
  });
}

/**
 * Lit un fichier Excel (XLSX) en utilisant un stream.
 * @param filePath Le chemin du fichier XLSX.
 */
export async function processExcelStream(filePath: string): Promise<FichierData> {
  const fichierFinal: FichierData = {};
  const options: Partial<exceljs.stream.xlsx.WorkbookStreamReaderOptions> = {
    sharedStrings: 'cache',
    hyperlinks: 'cache',
    worksheets: 'emit',
  };

  const workbookReader = new exceljs.stream.xlsx.WorkbookReader(filePath, options);
  let sheetCounter = 0; // Compteur pour générer des noms de feuilles

  try {
    for await (const worksheet of workbookReader) {
      // Générer un nom de feuille par défaut
      const sheetName = `Sheet${++sheetCounter}`;
      const donnees: ExcelRowData[] = [];
      const colonnes: string[] = [];
      let headerRow: ExcelRowData = {};

      for await (const row of worksheet) {
        const rowNumber = row.number;
        const rowData: ExcelRowData = {};

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const colLetter = getExcelColumnName(colNumber - 1);
          if (rowNumber === 1) {
            if (!colonnes.includes(colLetter)) colonnes.push(colLetter);
            headerRow[`${colLetter}1`] = cell.value;
          } else {
            rowData[`${colLetter}${rowNumber}`] = cell.value;
          }
        });

        if (rowNumber > 1 && Object.keys(rowData).length > 0) {
          donnees.push(rowData);
        }
      }

      fichierFinal[sheetName] = {
        colonnes,
        donnees: [headerRow, ...donnees],
      };
    }

    return fichierFinal;
  } catch (err) {
    throw new Error(`Erreur lors de la lecture du fichier Excel: ${err.message}`);
  }
}