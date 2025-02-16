import { Structure } from "@/structure/entities/structure.entity";
import { Transform, Type } from "class-transformer";
import { IsDate, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { MembreStruct } from "src/membre-struct/entities/membre-struct.entity";

export class CreateProjetDto {
        @IsNotEmpty()
        @IsString()
        libelleprojet:string
        @IsNotEmpty()
        @IsString()
        descprojet:string
        @IsNotEmpty()
        @Transform(({ value }) => new Date(value))
        @IsDate()
        dateDebut: Date
        @IsNotEmpty()
        @Transform(({ value }) => new Date(value))
        @IsDate()
        dateFin: Date
        @IsOptional()
        @IsString()
        etatprojet:string
        @IsNotEmpty()
        @IsString()
        nomstructure:string






        @Type(() => MembreStruct)
        membreStruct:MembreStruct


        @Type(()=>Structure)
        structure:Structure
}
