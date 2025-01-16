import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export class ApplyFunctionDto {
  @IsOptional()
  @IsString()
  nomFeuille?: string; // Nom de la feuille (facultatif)

  @IsNotEmpty()
  @IsArray()
  columnReferences: string[]; // Références des colonnes (e.g., "A1", "B1")

  @IsNotEmpty()
  @IsString()
  operation: string; // Fonction à appliquer (e.g., "sum", "average")

  @IsNotEmpty()
  @IsString()
  newnomcolonne: string; // Nom de la nouvelle colonne pour enregistrer les résultats

  @IsString()
  separator :string=" "
}
