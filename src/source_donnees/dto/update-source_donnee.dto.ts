import { PartialType } from '@nestjs/swagger';
import { CreateSourceDonneeDto } from './create-source_donnee.dto';
import { IsOptional, IsString, IsNumber, ValidateIf } from "class-validator";
import { Type } from "class-transformer";
import { Enquete } from "@/enquete/entities/enquete.entity";
import { DataType } from "@/data_type/entities/data_type.entity";
import { Formatfichier } from "@/formatfichier/entities/formatfichier.entity";
import { unitefrequence } from "@/frequence/entities/unitefrequence.entity";


export class UpdateSourceDonneeDto extends PartialType(CreateSourceDonneeDto) {
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

    @IsOptional()
    @Type(() => unitefrequence)
    unitefrequence?: unitefrequence;

    @IsOptional()
    @Type(() => Formatfichier)
    format?: Formatfichier;

    @IsOptional()
    @Type(() => DataType)
    typedonnes?: DataType;

    @IsOptional()
    @Type(() => Enquete)
    enquete?: Enquete;
}
