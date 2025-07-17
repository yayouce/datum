import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export class DeleteSheetDto {
  @IsString()
  nomFeuille?: string; // Nom de la feuille (facultatif)
  

}
