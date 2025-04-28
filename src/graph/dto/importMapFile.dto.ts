// src/graph/dto/import-map-file.dto.ts
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
// Assuming ColonneEtiquetteConfigDto exists in common-graph.dto.ts
import { ColonneEtiquetteConfigDto } from './common-graph.dto';

export class ImportMapFileDto {
  @IsString()
  @IsNotEmpty()
  titreGraphique: string;

  // Optional: Allow specifying which properties from the imported file
  // should be shown in popups.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ColonneEtiquetteConfigDto)
  colonnesEtiquettes?: ColonneEtiquetteConfigDto[];
}