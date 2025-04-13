// src/graph/dto/create-graph.dto.ts

import { Type } from 'class-transformer';
import {
    IsString,
    IsNotEmpty,
    IsEnum,
    IsOptional,
    IsArray,
    ValidateNested,
    IsObject, // Ajout pour IsObject
} from 'class-validator';

// Importez votre enum de types de graphiques mis à jour
import { typegraphiqueEnum } from 'src/generique/typegraphique.enum'; // Ajustez le chemin si nécessaire

// Importez l'enum et les interfaces/types nécessaires depuis l'entité Graph
// Assurez-vous que TypeGeometrieMap est bien exporté depuis graph.entity.ts
import { TypeGeometrieMap } from '../entities/graph.entity'; // Ajustez le chemin si nécessaire

// --- DTOs Helpers pour la Validation Imbriquée ---

// DTO Helper pour les définitions de Colonne Y (Graphiques Classiques)
class ColonneY {
    @IsNotEmpty()
    @IsString()
    colonne: string; // Le nom/identifiant de la colonne source

    @IsOptional()
    @IsString()
    formule?: string; // Formule optionnelle (ex: "SUM", "AVG")

    @IsOptional()
    @IsString()
    nomFeuille?: string | null; // Nom de la feuille si pertinent

    // 'valeurs' ne devrait probablement pas être ici dans un DTO de *création/définition*.
    // Les valeurs sont généralement calculées par le service. Commentez ou supprimez si non utilisé.
    // @IsOptional()
    // @IsArray()
    // valeurs?: number[];
}

// DTO Helper pour les définitions de Colonne X (Graphiques Classiques)
class ColonneX {
    @IsNotEmpty()
    @IsString()
    colonne: string; // Le nom/identifiant de la colonne source

    @IsOptional()
    @IsString()
    nomFeuille?: string | null; // Nom de la feuille si pertinent
}

// DTO Helper pour la configuration d'une colonne d'étiquette (Géospatial)
class ColonneEtiquetteConfigDto {
    @IsString()
    @IsNotEmpty()
    headerText: string; // L'en-tête de la colonne source choisi (ex: "User_Name")

    @IsString()
    @IsNotEmpty()
    libelleAffichage: string; // Le libellé à afficher dans le popup (ex: "Nom Producteur")
}

// DTO Helper pour la configuration géographique (Géospatial)
class ConfigGeographiqueDto {
    @IsEnum(TypeGeometrieMap) // Valide que la valeur fait partie de l'enum TypeGeometrieMap
    @IsNotEmpty()
    typeGeometrie: TypeGeometrieMap; // Ex: POINT, POLYGONE

    @IsString()
    @IsNotEmpty()
    nomGroupeDonnees: string; // La clé du groupe/feuille dans bd_normales (ex: "group_fu8vs82")

    @IsOptional() // Ces champs sont optionnels ici, mais le service validera leur présence selon typeGeometrie
    @IsString()
    @IsNotEmpty()
    colonneLatitudeHeader?: string; // En-tête pour la latitude (si POINT)

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    colonneLongitudeHeader?: string; // En-tête pour la longitude (si POINT)

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    colonneTraceHeader?: string; // En-tête pour la colonne de tracé (si POLYGONE/LIGNE)

    // Ajoutez ici les champs pour CHOROPLETHE si vous l'implémentez
    // @IsOptional()
    // @IsString()
    // @IsNotEmpty()
    // colonneIdentifiantGeoHeader?: string;
    // @IsOptional()
    // @IsString()
    // @IsNotEmpty()
    // colonneValeurChoroHeader?: string;
    // @IsOptional()
    // @IsString()
    // formuleValeurChoro?: string;
}


// --- DTO Principal pour la Création de Graphique ---

export class CreateGraphDto {

    @IsNotEmpty()
    @IsEnum(typegraphiqueEnum) // Valide contre l'enum complet (classique + géo)
    typeGraphique: typegraphiqueEnum;

    @IsNotEmpty()
    @IsString()
    titreGraphique: string;

    // --- Champs pour Graphiques Classiques (Optionnels) ---
    // Ces champs ne seront fournis que si typeGraphique est classique (LIGNE, BARRES, etc.)

    @IsOptional() // Rendu optionnel car non requis pour les graphiques géo
    @IsArray()
    @ValidateNested({ each: true }) // Valide chaque objet dans le tableau
    @Type(() => ColonneX) // Spécifie le type pour la validation imbriquée
    colonneX?: ColonneX[]; // Définitions pour l'axe X

    @IsOptional() // Rendu optionnel
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ColonneY)
    colonneY?: ColonneY[]; // Définitions pour l'axe/les séries Y


    // --- Champs pour Graphiques Géospatiaux (Optionnels) ---
    // Ces champs ne seront fournis que si typeGraphique est géo (CARTE_POINTS, CARTE_POLYGONE, etc.)

    @IsOptional() // Rendu optionnel car non requis pour les graphiques classiques
    @IsObject() // Valide que c'est un objet
    @ValidateNested() // Valide les propriétés de l'objet imbriqué
    @Type(() => ConfigGeographiqueDto) // Spécifie le type pour la validation
    configGeographique?: ConfigGeographiqueDto | null; // Configuration spécifique à la carte

    @IsOptional() // Rendu optionnel
    @IsArray() // Doit être un tableau
    @ValidateNested({ each: true }) // Valide chaque objet dans le tableau
    @Type(() => ColonneEtiquetteConfigDto) // Spécifie le type pour la validation
    colonnesEtiquettes?: ColonneEtiquetteConfigDto[] | null; // Configuration des étiquettes/popups


}