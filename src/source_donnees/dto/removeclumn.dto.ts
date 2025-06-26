import { IsArray, IsOptional, IsString } from "class-validator";

export class removeColumnDto {

        @IsOptional()
        @IsString()
        nomFeuille:string;

        @IsOptional()
        @IsArray()
        nomColonnes:string[]

    }