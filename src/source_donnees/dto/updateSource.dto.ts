import { IsOptional, IsString, IsNumber, ValidateIf } from "class-validator";

export class UpdateSourceDonneeDto {
  @IsOptional()
  @IsString()
  libelletypedonnees?: string;

  @IsOptional()
  @IsString()
  nomSource?: string;

  @IsOptional()
  @IsString()
  commentaire?: string;

  @IsOptional()
  @IsString()
  libelleformat?: string;

  @IsOptional()
  @IsString()
  libelleunite?: string;

  @IsOptional()
  @IsNumber()
  frequence?: number;

  @ValidateIf((o) => !o.source)
  @IsOptional()
  fichier?: any;

  @ValidateIf((o) => !o.fichier)
  @IsOptional()
  @IsString()
  source?: string;
}
