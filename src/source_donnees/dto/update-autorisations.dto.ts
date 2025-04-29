
import { IsArray, IsString, IsOptional, ArrayNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';



const validRoles = ["Top manager", "manager", "coordinateur", "admin"]; 
export class UpdateAutorisationsDto {

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
   // @IsIn(validRoles, { each: true }) // Valide que chaque rôle est connu (ajuster selon vos rôles)
    consulter?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
   // @IsIn(validRoles, { each: true })
    modifier?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
   // @IsIn(validRoles, { each: true })
    exporter?: string[];
}