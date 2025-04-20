// src/graph/dto/create-graph.dto.ts (Adapté)
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, ValidateNested, IsObject } from 'class-validator';
import { typegraphiqueEnum } from '@/generique/cartes.enum'; // Ajustez

// Importe les DTOs depuis le fichier commun
import { ConfigGeographiqueDto, ColonneEtiquetteConfigDto, MetaDonneesDto, TitreMetaDonneesDto } from './common-graph.dto';

// DTO Helper pour Colonne Y (peut rester ici ou aller dans common si réutilisé ailleurs)
class ColonneY {
    @IsNotEmpty() @IsString() colonne: string;
    @IsOptional() @IsString() formule?: string;
    @IsOptional() @IsString() nomFeuille?: string | null;
}

// DTO Helper pour Colonne X (peut rester ici ou aller dans common)
class ColonneX {
    @IsNotEmpty() @IsString() colonne: string;
    @IsOptional() @IsString() nomFeuille?: string | null;
}


export class CreateGraphDto {

    @IsNotEmpty() @IsEnum(typegraphiqueEnum)
    typeGraphique: typegraphiqueEnum;

    @IsNotEmpty() @IsString()
    titreGraphique: string;

    // --- Champs Classiques ---
    @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ColonneX)
    colonneX?: ColonneX[];

    @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ColonneY)
    colonneY?: ColonneY[];

    // --- Champs Géospatiaux (Utilisent les DTOs importés) ---
    @IsOptional() @IsObject() @ValidateNested() @Type(() => ConfigGeographiqueDto) // <= Utilise le DTO commun
    configGeographique?: ConfigGeographiqueDto; // Pas besoin de | null à la création généralement

    @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ColonneEtiquetteConfigDto) // <= Utilise le DTO commun
    colonnesEtiquettes?: ColonneEtiquetteConfigDto[];

    // --- Métadonnées ---
    @IsOptional() @IsObject() @ValidateNested() @Type(() => TitreMetaDonneesDto)
    titremetaDonnees?: TitreMetaDonneesDto | null;

    @IsOptional() @IsObject() @ValidateNested() @Type(() => MetaDonneesDto)
    metaDonnees?: MetaDonneesDto | null;

}