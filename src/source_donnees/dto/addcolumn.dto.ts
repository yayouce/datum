import { IsOptional, IsString } from "class-validator";

export class addColumnDto {

        @IsOptional()
        @IsString()
        nomFeuille:string;

        @IsOptional()
        @IsString()
        nomColonne:string
    
    
    }