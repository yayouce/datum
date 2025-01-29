import { Type } from "class-transformer";
import { IsEnum, IsString, IsArray, IsNotEmpty, IsOptional, ValidateNested } from "class-validator";
import { typegraphiqueEnum } from "generique/typegraphique.enum";
import { SourceDonnee } from "src/source_donnees/entities/source_donnee.entity";

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
  @ValidateNested({ each: true })
  @Type(() => ColonneY)
  colonneY: ColonneY[];

  @Type(() => SourceDonnee)
  source_donnees: any;
}
