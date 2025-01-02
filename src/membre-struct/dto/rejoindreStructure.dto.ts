import { Type } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Structure } from "src/structure/entities/structure.entity";
import { MembreStruct } from "../entities/membre-struct.entity";

export class rejoindrestructureDto {


@IsNotEmpty()
@IsString()
name: string;
@IsNotEmpty()
@IsString()
password:string;
@IsNotEmpty()
@IsString()
firstname:string;
@IsNotEmpty()
@IsString()
email:string;
@IsNotEmpty()
@IsString()
contact:string;



@IsNotEmpty()
@IsString()
nomStruct : string;
@IsNotEmpty()
@IsString()
emailSuperieur : string;

@Type(() =>MembreStruct)
superieur

@Type(() =>Structure)
structure
}
