import { PartialType } from '@nestjs/swagger';
import { CreateProjetDto } from './create-projet.dto';
import { IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { MembreStruct } from '@/membre-struct/entities/membre-struct.entity';
import { Structure } from '@/structure/entities/structure.entity';

export class UpdateProjetDto extends PartialType(CreateProjetDto) {
            @IsNotEmpty()
                    @IsOptional()
                    libelleprojet:string
                    @IsNotEmpty()
                    @IsOptional()
                    descprojet:string
                    @IsNotEmpty()
                    @Transform(({ value }) => new Date(value))
                    @IsDate()
                    dateDebut: Date
                    @IsNotEmpty()
                    @Transform(({ value }) => new Date(value))
                    @IsDate()
                    dateFin: Date
                    @IsNotEmpty()
                    @IsOptional()
                    etatprojet:string
                    @IsNotEmpty()
                    @IsOptional()
                    nomstructure:string
            
            
            
            
            
            
                    @Type(() => MembreStruct)
                    membreStruct:MembreStruct
        
                    @Type(()=>Structure)
                    structure:Structure
}
