// src/utils/join.helpers.ts

import { HttpException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SourceDonnee } from '../entities/source_donnee.entity';


// L'interface est aussi exportée pour être utilisée dans le service
export interface FullOuterJoinOptions {
  dataA: Record<string, any>[];
  keyColumnA: string;
  headerNamesA: string[];
  dataB: Record<string, any>[];
  keyColumnB: string;
  headerNamesB: string[];
}

/**
 * Récupère une paire de SourceDonnee depuis la base de données.
 * @param repo Le repository TypeORM pour interroger la base.
 * @param nomSource1 Nom de la première source.
 * @param nomSource2 Nom de la deuxième source.
 * @param idprojet ID du projet.
 */
export async function fetchSourcePair(
  repo: Repository<SourceDonnee>,
  nomSource1: string,
  nomSource2: string,
  idprojet: string
): Promise<{ sourceData1: SourceDonnee; sourceData2: SourceDonnee }> {
  const [sourceData1, sourceData2] = await Promise.all([
    repo.findOne({
      where: { nomSource: nomSource1, enquete: { projet: { idprojet } } },
      relations: ["enquete", "enquete.projet"],
    }),
    repo.findOne({
      where: { nomSource: nomSource2, enquete: { projet: { idprojet } } },
      relations: ["enquete", "enquete.projet"],
    }),
  ]);

  if (!sourceData1 || !sourceData2) {
    throw new HttpException("Une ou les deux sources n'ont pas été trouvées dans le projet", 404);
  }
  return { sourceData1, sourceData2 };
}

/**
 * Extrait et formate les données d'une feuille de calcul brute.
 */
export function extractSheetData(sheetData: any[], keyColumnRef: string): { headerNames: string[]; rows: Record<string, any>[]; keyColumnName: string; } {
  if (!sheetData || sheetData.length < 2) {
    return { headerNames: [], rows: [], keyColumnName: '' };
  }

  const headerRow = sheetData[0];
  if (!headerRow[keyColumnRef]) {
    throw new Error(`La clé de jointure "${keyColumnRef}" n'existe pas dans la feuille.`);
  }
  
  const keyColumnName = headerRow[keyColumnRef];
  const headerNames = Object.values(headerRow) as string[];

  const rows = sheetData.slice(1).map(row => {
    const formattedRow: Record<string, any> = {};
    for (const cell in row) {
      const columnLetter = cell.replace(/\d+/g, '');
      const columnName = headerRow[columnLetter + "1"];
      if (columnName) {
        formattedRow[columnName] = row[cell];
      }
    }
    return formattedRow;
  });

  return { headerNames, rows, keyColumnName };
}

/**
 * Effectue une jointure externe complète (FULL OUTER JOIN) sur deux ensembles de données.
 */
export function performFullOuterJoin({ dataA, keyColumnA, headerNamesA, dataB, keyColumnB, headerNamesB }: FullOuterJoinOptions): Record<string, any>[] {
  const mapB = new Map<any, { row: Record<string, any>; matched: boolean }>();
  for (const rowB of dataB) {
    const joinKey = rowB[keyColumnB];
    if (joinKey !== undefined && joinKey !== null) {
      mapB.set(joinKey, { row: rowB, matched: false });
    }
  }

  const joinedData: Record<string, any>[] = [];

  // Partie LEFT JOIN
  for (const rowA of dataA) {
    const joinKey = rowA[keyColumnA];
    const matchB = mapB.get(joinKey);
    const rowAFormatted = Object.fromEntries(Object.entries(rowA).map(([k, v]) => [`${k}_source1`, v]));

    if (matchB) {
      matchB.matched = true;
      const rowBFormatted = Object.fromEntries(Object.entries(matchB.row).map(([k, v]) => [`${k}_source2`, v]));
      joinedData.push({ ...rowAFormatted, ...rowBFormatted, index_jointure: joinKey });
    } else {
      const placeholderB = headerNamesB.reduce((acc, header) => ({ ...acc, [`${header}_source2`]: null }), {});
      joinedData.push({ ...rowAFormatted, ...placeholderB, index_jointure: joinKey });
    }
  }

  // Partie RIGHT-ONLY JOIN
  for (const [joinKey, { row, matched }] of mapB.entries()) {
    if (!matched) {
      const placeholderA = headerNamesA.reduce((acc, header) => ({ ...acc, [`${header}_source1`]: null }), {});
      const rowBFormatted = Object.fromEntries(Object.entries(row).map(([k, v]) => [`${k}_source2`, v]));
      joinedData.push({ ...placeholderA, ...rowBFormatted, index_jointure: joinKey });
    }
  }
  
  return joinedData;
}


/**
 * Reformate les données jointes dans le format de stockage attendu par la BDD.
 */
export function formatJoinedDataForStorage(joinedData: Record<string, any>[], headerNamesA: string[], headerNamesB: string[]): { donnees: any[], colonnes: string[] } {
  const finalHeaders = [
    ...headerNamesA.map(h => `${h}_source1`),
    ...headerNamesB.map(h => `${h}_source2`),
    'index_jointure'
  ];
  
  const columns = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").slice(0, finalHeaders.length);

  const headerMapping = finalHeaders.reduce((acc, header, index) => {
    acc[`${columns[index]}1`] = header;
    return acc;
  }, {});

  const transformedData = joinedData.map((row, rowIndex) => {
    return finalHeaders.reduce((acc, header, colIndex) => {
      acc[`${columns[colIndex]}${rowIndex + 2}`] = row[header] ?? null;
      return acc;
    }, {});
  });

  return {
    donnees: [headerMapping, ...transformedData],
    colonnes: columns
  };
}