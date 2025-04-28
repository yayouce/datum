import { SourceDonneeAction } from "@/generique/autorisation.enum";


export class UserPermissionInfoDto {
    userId: string;
    userName: string;
    userEmail: string;
    // Permissions effectives (après fusion override/rôle)
    permissionsEffectives: Partial<Record<SourceDonneeAction, boolean>>;
    // Permissions héritées du rôle (pour info UI)
    permissionsRole: Partial<Record<SourceDonneeAction, boolean>>;
    // Permissions spécifiques brutes (override)
    permissionsSpecifiquesBrutes: Partial<Record<SourceDonneeAction, boolean | null>>;
}