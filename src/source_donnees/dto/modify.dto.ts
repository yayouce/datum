import { IsOptional, IsString } from "class-validator";

export class modifyColumnDto {

        @IsOptional()
        @IsString()
        nomFeuille:string;

        @IsOptional()
        @IsString()
        nomColonne:string


        @IsOptional()
        @IsString()
        newnomColonne:string


        @IsOptional()
        transform:any
    
    }