import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export class fonctionapplique {
  @IsOptional()
  @IsString()
  nomfeuille?: string;

 
  @IsNotEmpty()
  @IsString()
  formula: string; 

  @IsNotEmpty()
  @IsString()
  colonnescible: string;


}
