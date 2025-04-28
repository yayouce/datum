import { SourceDonneeAction, SourceDonneeRole } from '@/generique/autorisation.enum';
import { Type } from 'class-transformer';
import { IsBoolean, IsDefined, IsEnum, IsObject, IsOptional, ValidateNested } from 'class-validator';


class RolePermissionsDto {
    @IsBoolean() @IsOptional() [SourceDonneeAction.CONSULTER]?: boolean;
    @IsBoolean() @IsOptional() [SourceDonneeAction.MODIFIER]?: boolean;
    @IsBoolean() @IsOptional() [SourceDonneeAction.EXPORTER]?: boolean;
}

export class UpdateAutorisationsRolesDto {
    @IsObject()
    @ValidateNested({ each: true })
    @Type(() => RolePermissionsDto)
    @IsDefined()
    // Ne doit contenir que les clés Top manager, Manager, Coordinateur
    autorisations: Partial<Record<SourceDonneeRole, RolePermissionsDto>>;
}