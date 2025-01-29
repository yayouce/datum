import { PartialType } from '@nestjs/swagger';
import { CreateGraphDto } from './create-graph.dto';

import { IsEnum, IsString, IsArray, IsOptional } from "class-validator";
import { typegraphiqueEnum } from "generique/typegraphique.enum";
import { Type } from 'class-transformer';
import { SourceDonnee } from 'src/source_donnees/entities/source_donnee.entity';


export class UpdateGraphDto extends PartialType(CreateGraphDto) {

@IsOptional()
  @IsEnum(typegraphiqueEnum)
  typeGraphique: typegraphiqueEnum;

  @IsOptional()
  @IsString()
  titreGraphique: string;

  @IsOptional()
  @IsString()
  colonneX: string;

  @IsOptional()
  @IsArray()
  colonneY: string[];

  @IsOptional()
  @IsArray()
  formules_Y: string[];

  @IsOptional()
  @IsArray()
  nomsFeuilles:string[]
 


   @Type(() =>SourceDonnee)
    source_donnees:any



}
