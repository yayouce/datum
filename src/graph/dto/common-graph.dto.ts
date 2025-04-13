// src/graph/dto/common-graph.dto.ts (ou similaire)
import { Type } from 'class-transformer';
import { IsString, IsIn, IsOptional, ValidateNested, IsBoolean, IsObject, IsArray, IsNotEmpty, IsInt, Min } from 'class-validator';

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
  specifiques?: string[]; // Peut être mis à jour globalement ici OU via ySerieUpdates
}

// DTO principal pour MetaDonnees
export class MetaDonneesDto {
  @IsOptional() @IsString() @IsIn(['horizontal', 'vertical']) sensEtiquette?: string;
  @IsOptional() @IsString() @IsIn(['interieure', 'exterieure']) positionEtiquette?: string;
  @IsOptional() @IsString() @IsIn(['haut', 'bas', 'gauche', 'droite']) positionLegende?: string;

  @IsOptional() @ValidateNested() @Type(() => AxesSpecifiesDto)
  axesSpecifies?: AxesSpecifiesDto;

  @IsOptional() @ValidateNested() @Type(() => CouleursDto)
  couleurs?: CouleursDto;

  // colonneXOriginale n'est pas fournie par l'utilisateur
}

// DTO pour TitreMetaDonnees
export class TitreMetaDonneesDto {
    @IsOptional() @IsString() /*@IsHexColor()*/ couleurTitre?: string;
    @IsOptional() @IsString() /*@IsHexColor()*/ couleurFond?: string;
}

// DTO pour la mise à jour ciblée (Nouveau, spécifique à l'update par nom)
export class YSerieAppearanceUpdateDto {
    @IsInt()     // L'index est requis
    @Min(0)
    indexY: number; // indexe de la colonne à cibler

    @IsString() @IsNotEmpty()
    colonneName: string; // Nom de la colonne à cibler

    @IsOptional() @IsString() @IsNotEmpty() /*@IsHexColor()*/
    couleur?: string; // Nouvelle couleur

    @IsOptional() @IsString() @IsNotEmpty()
    legende?: string; // Champ optionnel pour légende personnalisée
}