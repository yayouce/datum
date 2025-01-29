import { PartialType } from '@nestjs/swagger';
import { CreateGraphDto } from './create-graph.dto';

import { IsEnum, IsString, IsArray, IsOptional, ValidateNested, IsNotEmpty } from "class-validator";
import { typegraphiqueEnum } from "generique/typegraphique.enum";
import { Type } from 'class-transformer';
import { SourceDonnee } from 'src/source_donnees/entities/source_donnee.entity';

class ColonneY {
  @IsNotEmpty()
  @IsString()
  colonne: string;

  @IsOptional()
  @IsString()
  formule: string;

  @IsOptional()
  @IsString()
  nomFeuille: string | null;
}

class ColonneX {
  @IsNotEmpty()
  @IsString()
  colonne: string;

  @IsOptional()
  @IsString()
  nomFeuille: string | null;
}



export class UpdateGraphDto extends PartialType(CreateGraphDto) {
  @IsOptional()
  @IsEnum(typegraphiqueEnum)
  typeGraphique?: typegraphiqueEnum;

  @IsOptional()
  @IsString()
  titreGraphique?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({each:true})
  @Type(()=>ColonneX)
  colonneX?: ColonneX[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ColonneY)
  colonneY?: ColonneY[];

  @Type(() => SourceDonnee)
  @IsOptional()
  source_donnees?: any;
}
