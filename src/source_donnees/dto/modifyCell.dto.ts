import { IsNotEmpty, IsString } from "class-validator";

export class modifyCellDto {
  @IsNotEmpty()
  @IsString()
  nomFeuille: string;

  @IsNotEmpty()
  @IsString()
  cellule: string; // Ex: "A2", "B3", etc.

  @IsNotEmpty()
  nouvelleValeur: any; // Peut être un string, number, boolean, etc.
}
