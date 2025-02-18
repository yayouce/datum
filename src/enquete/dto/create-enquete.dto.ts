import { Transform, Type } from "class-transformer"
import {  IsDate, IsNotEmpty, IsOptional, IsString } from "class-validator"
import { MembreStruct } from "src/membre-struct/entities/membre-struct.entity"


export class CreateEnqueteDto {
 @IsNotEmpty()
        @IsString()
        libelleEnquete:string
        @IsNotEmpty()
        @IsString()
        commentaireEnquete:string
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
        etatEnquete:string
        @Type(() => MembreStruct)
        membreStruct:MembreStruct
       

    
}
