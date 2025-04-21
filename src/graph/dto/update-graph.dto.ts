// src/graph/dto/update-graph.dto.ts (Version finale et correcte)
import { PartialType } from '@nestjs/mapped-types';
import { CreateGraphDto } from './create-graph.dto'; // Hérite de la version MISE À JOUR
import { IsOptional, ValidateNested, IsArray, IsObject } from "class-validator";
import { Type } from 'class-transformer';

// Importe TOUS les DTOs communs nécessaires
import {
    ConfigGeographiqueDto,          // Le DTO de base pour la config géo
    ColonneEtiquetteConfigDto,      // Le DTO de base pour les étiquettes
    MetaDonneesDto,
    TitreMetaDonneesDto,
    YSerieAppearanceUpdateDto
} from './common-graph.dto';

export class UpdateGraphDto extends PartialType(CreateGraphDto) {
  // typeGraphique?, titreGraphique?, colonneX?, colonneY? sont hérités et optionnels.

  // configGeographique est hérité comme Partial<ConfigGeographiqueDto> | undefined.
  // On le redéclare JUSTE pour ajouter la possibilité d'envoyer 'null' pour le supprimer.
  // On utilise le même @Type que dans CreateGraphDto.
  @IsOptional()
  @ValidateNested()
  @Type(() => ConfigGeographiqueDto) // <<< Pointe vers le DTO commun de base
  @IsObject()
  configGeographique?: ConfigGeographiqueDto | null; // Le type est compatible avec ce que PartialType génère

  // Idem pour colonnesEtiquettes
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ColonneEtiquetteConfigDto) // <<< Pointe vers le DTO commun de base
  colonnesEtiquettes?: ColonneEtiquetteConfigDto[] | null;

  // Idem pour metaDonnees et titremetaDonnees (pour permettre null)
  @IsOptional()
  @ValidateNested()
  @Type(() => MetaDonneesDto)
  metaDonnees?: MetaDonneesDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => TitreMetaDonneesDto)
  titremetaDonnees?: TitreMetaDonneesDto | null;

 
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => YSerieAppearanceUpdateDto)
  couleurY?: YSerieAppearanceUpdateDto[];

  
}