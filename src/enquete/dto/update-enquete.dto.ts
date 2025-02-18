import { PartialType } from '@nestjs/swagger';
import { CreateEnqueteDto } from './create-enquete.dto';



import { Transform, Type } from "class-transformer"
import {  IsDate, IsNotEmpty, IsOptional, IsString } from "class-validator"
import { MembreStruct } from "src/membre-struct/entities/membre-struct.entity"

export class UpdateEnqueteDto extends PartialType(CreateEnqueteDto) {



    @IsOptional()
            @IsString()
            libelleEnquete:string
            @IsOptional()
            @IsString()
            commentaireEnquete:string
            @IsOptional()
            @Transform(({ value }) => new Date(value))
            @IsDate()
            dateDebut: Date
            @IsOptional()
            @Transform(({ value }) => new Date(value))
            @IsDate()
            dateFin: Date
            @IsOptional()
            @IsString()
            etatEnquete:string
            @Type(() => MembreStruct)
            membreStruct:MembreStruct
}
