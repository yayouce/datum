export function getExcelColumnName(colIndex: number): string { // colIndex est 0-basé
  let columnName = "";
  let num = colIndex;
  while (num >= 0) {
    columnName = String.fromCharCode(65 + (num % 26)) + columnName;
    num = Math.floor(num / 26) - 1;
  }
  return columnName;
}