import { IsOptional, IsString } from "class-validator";

export class removeColumnDto {

        @IsOptional()
        @IsString()
        nomFeuille:string;

        @IsOptional()
        @IsString()
        nomColonne:string
    
    
    }