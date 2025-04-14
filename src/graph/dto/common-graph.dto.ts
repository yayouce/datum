// src/graph/dto/common-graph.dto.ts (Mis à jour et complet)

import { Type } from 'class-transformer';
import { IsString, IsIn, IsOptional, ValidateNested, IsBoolean, IsObject, IsArray, IsNotEmpty, IsInt, Min, IsEnum } from 'class-validator';
import { TypeGeometrieMap, ConfigGeographique, ColonneEtiquetteConfig } from '../entities/graph.entity'; // !! Ajustez le chemin !!

// --- VOS DTOs COMMUNS EXISTANTS ---

// DTO pour l'objet imbriqué axesSpecifies
export class AxesSpecifiesDto {
  @IsOptional() @IsBoolean() x?: boolean;
  @IsOptional() @IsBoolean() y?: boolean;
}

// DTO pour l'objet imbriqué couleurs
export class CouleursDto {
  @IsOptional() @IsArray() @IsString({ each: true })
  generiques?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  specifiques?: string[];
}

// DTO principal pour MetaDonnees
export class MetaDonneesDto {
  @IsOptional() @IsString() @IsIn(['horizontal', 'vertical']) sensEtiquette?: 'horizontal' | 'vertical';
  @IsOptional() @IsString() @IsIn(['interieure', 'exterieure']) positionEtiquette?: 'interieure' | 'exterieure';
  @IsOptional() @IsString() @IsIn(['haut', 'bas', 'gauche', 'droite']) positionLegende?: 'haut' | 'bas' | 'gauche' | 'droite';

  @IsOptional() @ValidateNested() @Type(() => AxesSpecifiesDto)
  axesSpecifies?: AxesSpecifiesDto;

  @IsOptional() @ValidateNested() @Type(() => CouleursDto)
  couleurs?: CouleursDto;
}

// DTO pour TitreMetaDonnees
export class TitreMetaDonneesDto {
    @IsOptional() @IsString() /* @IsHexColor() */ couleurTitre?: string;
    @IsOptional() @IsString() /* @IsHexColor() */ couleurFond?: string;
}

// DTO pour la mise à jour ciblée de l'apparence d'une série Y
export class YSerieAppearanceUpdateDto {
    @IsInt()
    @Min(0)
    indexY: number;

    @IsString() @IsNotEmpty()
    colonneName: string; // Nom de la colonne Y cible

    @IsOptional() @IsString() @IsNotEmpty() /* @IsHexColor() */
    couleur?: string; // Nouvelle couleur

    @IsOptional() @IsString() @IsNotEmpty()
    legende?: string; // Légende personnalisée
}

// --- NOUVEAUX DTOs Helpers ajoutés ici ---

// DTO pour ColonneEtiquetteConfig (utilisé par Create et Update)
export class ColonneEtiquetteConfigDto implements ColonneEtiquetteConfig {
    @IsString()
    @IsNotEmpty()
    headerText: string;

    @IsString()
    @IsNotEmpty()
    libelleAffichage: string;
}

// DTO pour ConfigGeographique (utilisé par Create et comme base pour Update via PartialType)
export class ConfigGeographiqueDto implements ConfigGeographique { // Utilise l'interface de l'entité
    @IsEnum(TypeGeometrieMap)
    @IsNotEmpty()
    typeGeometrie: TypeGeometrieMap;

    @IsString()
    @IsNotEmpty()
    nomGroupeDonnees: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty() // Vide n'est pas valide si le champ est présent
    colonneLatitudeHeader?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    colonneLongitudeHeader?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    colonneTraceHeader?: string;

    
}