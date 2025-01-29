import { Type } from "class-transformer";
import { IsEnum, IsString, IsArray, IsNotEmpty, IsOptional } from "class-validator";
import { typegraphiqueEnum } from "generique/typegraphique.enum";
import { SourceDonnee } from "src/source_donnees/entities/source_donnee.entity";

export class CreateGraphDto {
    @IsNotEmpty()
  @IsEnum(typegraphiqueEnum)
  typeGraphique: typegraphiqueEnum;

  @IsNotEmpty()
  @IsString()
  titreGraphique: string;

  @IsNotEmpty()
  @IsString()
  colonneX: string;

  @IsNotEmpty()
  @IsArray()
  colonneY: string[];

  @IsOptional()
  @IsArray()
  formulesY: string[];


  @IsOptional()
  @IsArray()
  nomsFeuilles:string[]


  


    // @IsOptional()
    // @IsString()
    // nomsourceDonnees:string;

  @Type(() =>SourceDonnee)
  source_donnees:any



}
