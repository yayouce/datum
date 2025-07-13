// src/utils/join.helpers.ts

import { HttpException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SourceDonnee } from '../entities/source_donnee.entity'; // Assurez-vous que le chemin est correct

// L'interface pour les options de la fonction de jointure
export interface FullOuterJoinOptions {
  dataA: Record<string, any>[];
  keyColumnA: string;
  headerNamesA: string[];
  dataB: Record<string, any>[];
  keyColumnB: string;
  headerNamesB: string[];
}

// --- HELPER INTERNE ---
/**
 * Génère un nom de colonne Excel (A, B, ..., Z, AA, AB, ...) à partir d'un index base 0.
 * @param index L'index de la colonne (0 pour A, 1 pour B, etc.).
 */
function getExcelColumnName(index: number): string {
    let name = '';
    let i = index;
    do { name = String.fromCharCode(i % 26 + 65) + name; i = Math.floor(i / 26) - 1; } while (i >= 0);
    return name;
}

// --- FONCTIONS EXPORTÉES ---

/**
 * Récupère une paire de SourceDonnee depuis la base de données.
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
 * VERSION CORRIGÉE : Déduit les en-têtes depuis le résultat de la jointure pour plus de robustesse.
 */
export function formatJoinedDataForStorage(joinedData: Record<string, any>[]): { donnees: any[], colonnes: string[] } {
  if (!joinedData || joinedData.length === 0) {
    return { donnees: [], colonnes: [] };
  }

  // Étape 1: Déduire tous les en-têtes possibles à partir de TOUTES les lignes jointes.
  const allKeys = new Set<string>();
  joinedData.forEach(row => {
    Object.keys(row).forEach(key => allKeys.add(key));
  });

  // Étape 2: Créer un ordre d'en-têtes stable et logique.
  const finalHeaders = Array.from(allKeys).sort((a, b) => {
    const aIsSource1 = a.endsWith('_source1');
    const bIsSource1 = b.endsWith('_source1');
    const aIsSource2 = a.endsWith('_source2');
    const bIsSource2 = b.endsWith('_source2');

    if (a === 'index_jointure') return 1; // Mettre index_jointure à la fin
    if (b === 'index_jointure') return -1;

    if (aIsSource1 && !bIsSource1) return -1; // source1 avant tout le reste
    if (!aIsSource1 && bIsSource1) return 1;

    if (aIsSource2 && bIsSource1) return 1; // source2 après source1
    if (aIsSource1 && bIsSource2) return -1;

    // Trier alphabétiquement à l'intérieur des groupes
    return a.localeCompare(b);
  });

  const columns = finalHeaders.map((_, index) => getExcelColumnName(index));

  const headerMapping = finalHeaders.reduce((acc, header, index) => {
    acc[`${columns[index]}1`] = header;
    return acc;
  }, {});

  const transformedData = joinedData.map((row, rowIndex) => {
    const rowData: Record<string, any> = {};
    finalHeaders.forEach((header, colIndex) => {
      // Utiliser row[header] ?? null pour gérer les cas où une colonne
      // n'existe pas pour une ligne donnée (le principe de la FULL JOIN)
      rowData[`${columns[colIndex]}${rowIndex + 2}`] = row[header] ?? null;
    });
    return rowData;
  });

  return {
    donnees: [headerMapping, ...transformedData],
    colonnes: columns,
  };
}