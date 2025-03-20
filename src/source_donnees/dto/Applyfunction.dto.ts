import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export class ApplyfunctionDto2 {
  @IsOptional()
  @IsString()
  nomFeuille?: string; // Nom de la feuille (facultatif)


  @IsNotEmpty()
  @IsString()
  formula:string

  @IsNotEmpty()
  @IsString()
  targetColumn: string;

}
