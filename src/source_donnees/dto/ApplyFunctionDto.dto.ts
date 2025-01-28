import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export class ApplyFunctionDto {
  @IsOptional()
  @IsString()
  nomFeuille?: string; // Nom de la feuille (facultatif)

  @IsNotEmpty()
  @IsArray()
  columnReferences: string[]; // Références des colonnes où appliquer l'opération (e.g., ["A1", "B1"])

  @IsNotEmpty()
  @IsString()
  operation: string; // Fonction à appliquer (e.g., "sum", "average")

  @IsNotEmpty()
  @IsString()
  targetColumn: string;

  @IsOptional()
  @IsString()
  separator?: string = " "; // Séparateur pour la concaténation (facultatif)
}
