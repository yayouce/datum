import { SourceDonneeAction } from '@/generique/permissions.types';
import { Type } from 'class-transformer';
import { IsBoolean, IsDefined, IsObject, IsOptional, IsString, ValidateNested, Allow } from 'class-validator';


// Permissions pour un seul utilisateur
class UserSpecificPermissionDto {
    // Allow null pour explicitement retirer un override
    @IsBoolean() @IsOptional() @Allow(null) [SourceDonneeAction.CONSULTER]?: boolean | null;
    @IsBoolean() @IsOptional() @Allow(null) [SourceDonneeAction.MODIFIER]?: boolean | null;
    @IsBoolean() @IsOptional() @Allow(null) [SourceDonneeAction.EXPORTER]?: boolean | null;
}

export class UpdateUserPermissionsDto {
    /**
     * Objet où la clé est l'ID de l'utilisateur (string)
     * et la valeur est l'objet de ses permissions spécifiques.
     * Envoyer `null` pour une action spécifique la supprime de l'override.
     */
    @IsObject()
    @ValidateNested({ each: true })
    @Type(() => UserSpecificPermissionDto)
    @IsDefined()
    userOverrides: Record<string, UserSpecificPermissionDto>;
}




