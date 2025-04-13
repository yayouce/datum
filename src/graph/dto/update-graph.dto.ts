// src/graph/dto/update-graph.dto.ts
import { PartialType } from '@nestjs/mapped-types'; // Ou @nestjs/swagger si vous préférez
import { CreateGraphDto } from './create-graph.dto'; // Importe le DTO de base
import { IsOptional, ValidateNested, IsObject, IsArray } from "class-validator";
import { Type } from 'class-transformer';

// Importe les DTOs communs et celui spécifique à l'update
import { MetaDonneesDto, TitreMetaDonneesDto, YSerieAppearanceUpdateDto } from './common-graph.dto';

export class UpdateGraphDto extends PartialType(CreateGraphDto) {
  // Les champs de CreateGraphDto (typeGraphique, titreGraphique, colonneX, colonneY, etc.)
  // sont hérités et rendus optionnels par PartialType.
  // PAS BESOIN de les redéclarer sauf si on change les validateurs.

  // --- Champs spécifiques ou dont on veut forcer le type/validation ---

  // Assurer la validation correcte pour metaDonnees (remplace le 'any' implicite)
  @IsOptional()
  @ValidateNested() // Valide l'objet interne selon MetaDonneesDto
  @Type(() => MetaDonneesDto) // Nécessaire pour class-transformer
  metaDonnees?: MetaDonneesDto | null; // Permet de mettre à jour ou supprimer

  // Assurer la validation correcte pour titremetaDonnees
  @IsOptional()
  @ValidateNested()
  @Type(() => TitreMetaDonneesDto)
  titremetaDonnees?: TitreMetaDonneesDto | null; // Permet de mettre à jour ou supprimer

  // --- Nouveau champ pour les mises à jour ciblées par nom ---
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true }) // Valide chaque item du tableau
  @Type(() => YSerieAppearanceUpdateDto) // Utilise le DTO par nom de colonne
  couleurY?: YSerieAppearanceUpdateDto[];

  // Le champ 'source_donnees' a été supprimé car non pertinent/dangereux ici.
}