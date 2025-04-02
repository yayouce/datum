import { ArrayNotEmpty, ArrayUnique, IsArray, IsBoolean, IsOptional, IsString } from "class-validator";

export class MasqueColumnToggleDto {

    @IsOptional()
    @IsString()
    nomFeuille?: string;

    @IsArray()
    @ArrayNotEmpty()
    @ArrayUnique()
    @IsString({ each: true })
    colonnes: string[];   
    
    @IsBoolean()
    masquer: boolean;        
}
  