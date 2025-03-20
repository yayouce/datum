import { IsNotEmpty, IsString } from "class-validator";

export class JoinSourcesDto {
  @IsNotEmpty()
  @IsString()
  source1: string; // Nom de la première source

  @IsNotEmpty()
  @IsString()
  source2: string; // Nom de la deuxième source

  @IsNotEmpty()
  @IsString()
  sheet1: string; // Feuille contenant les données dans source1

  @IsNotEmpty()
  @IsString()
  sheet2: string; // Feuille contenant les données dans source2

  @IsNotEmpty()
  @IsString()
  key1: string; // Clé utilisée pour la jointure dans source1

  @IsNotEmpty()
  @IsString()
  key2: string; // Clé utilisée pour la jointure dans source2
}
