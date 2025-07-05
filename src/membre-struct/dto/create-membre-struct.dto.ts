import { Trim } from "@/decorator/trimuserinput.decorator";
import { Type } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Structure } from "src/structure/entities/structure.entity";

export class CreateMembreStructDto {


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
@Trim()
nomStruct : string;
@IsNotEmpty()
@IsString()
descStruct : string;
@IsNotEmpty()
@IsString()
contactStruct : string;
@IsNotEmpty()
@IsString()
@Trim()
emailStruct : string;
@IsNotEmpty()
@IsString()
localisationStruc:string
@IsOptional()
@IsBoolean()
adhesion:boolean
@Type(() =>Structure)
structure
}
