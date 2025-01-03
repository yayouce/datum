import { PartialType } from '@nestjs/swagger';
import { CreateProjetDto } from './create-projet.dto';
import { IsDate, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProjetDto extends PartialType(CreateProjetDto) {
            @IsOptional()
            @IsString()
            libelleprojet:string
            @IsOptional()
            @IsString()
            descprojet:string
            @IsOptional()
            @Transform(({ value }) => new Date(value))
            @IsDate()
            dateDebut: Date
            @IsOptional()
            @Transform(({ value }) => new Date(value))
            @IsDate()
            dateFin: Date
            @IsOptional()
            @IsString()
            etatprojet:string
}
