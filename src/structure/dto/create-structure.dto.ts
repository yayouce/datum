
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";
import { MembreStruct } from "src/membre-struct/entities/membre-struct.entity";

export class CreateStructureDto {   
    @IsNotEmpty()
    @IsArray() //Valide que membres est bien un tableau.
    @ValidateNested({ each: true }) //Indique que chaque élément du tableau doit être validé selon les règles de l'entité MembreCoEntity
    @Type(() => MembreStruct) //Transforme chaque élément du tableau en instance de MembreCoEntity, ce qui permet une validation en profondeur de chaque membre du tableau.
    membres:MembreStruct[]=[]
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
    localisationStruc:string;

    @IsOptional()
    @IsBoolean()
    adhesion:boolean
}   
