// src/source_donnees/types/permissions.types.ts

/**
 * Rôles globaux de la plateforme.
 */
export enum Role {
    USER = 'client',
    ADMIN = 'admin',
    SUPERADMIN = 'superadmin',
}

/**
 * Rôles spécifiques au contexte d'une Source de Données / Structure.
 * UTILISEZ VOS NOMS DE RÔLES RÉELS.
 */
export enum SourceDonneeRole {
    TOP_MANAGER = 'Top manager', // <-- Corrigé
    MANAGER = 'manager',         // <-- Corrigé
    COORDINATEUR = 'coordinateur', // <-- Corrigé
}

export enum SourceDonneeAction {
    CONSULTER = 'CONSULTER',
    MODIFIER = 'MODIFIER',
    EXPORTER = 'EXPORTER',
}

// --- Interfaces (restent les mêmes structurellement) ---

export type RolePermissions = Partial<Record<SourceDonneeAction, boolean>>;

// La clé est maintenant une valeur de l'enum SourceDonneeRole corrigé
export type SourceAutorisationsParRole = Partial<Record<SourceDonneeRole, RolePermissions>>;

export type SourceAutorisationsSpecifiquesUser = Partial<Record<string, RolePermissions>>;

export interface SourceDonneeAutorisationsRolesResponse {
    [roleName: string]: RolePermissions; // Peut toujours inclure "Administrateur"
}

export interface UserPermissionInfoDto {
    userId: string;
    userName: string;
    userEmail: string;
    roleMembre?: SourceDonneeRole; // <-- Le type est maintenant basé sur l'enum corrigé
    permissionsEffectives: RolePermissions;
    permissionsRole: RolePermissions;
    permissionsSpecifiquesBrutes: RolePermissions;
}

// --- DTOs (restent les mêmes structurellement, mais les clés attendues changent) ---

export class UpdateAutorisationsRolesDto {
    // Les clés attendues ici sont maintenant 'Top manager', 'Manager', 'Coordinateur'
    autorisations: SourceAutorisationsParRole;
}

export class UpdateUserPermissionsDto {
    userOverrides: Record<string, Partial<Record<SourceDonneeAction, boolean | null>>>;
}