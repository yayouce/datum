import { Type } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";
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
nomStruct : string;
@IsNotEmpty()
@IsString()
descStruct : string;
@IsNotEmpty()
@IsString()
contactStruct : string;
@IsNotEmpty()
@IsString()
emailStruct : string;
@IsNotEmpty()
@IsString()
localisationStruc:string

 @Type(() =>Structure)
structure
  
}
