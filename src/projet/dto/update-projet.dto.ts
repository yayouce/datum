import { PartialType } from '@nestjs/swagger';
import { CreateProjetDto } from './create-projet.dto';
import { IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { MembreStruct } from '@/membre-struct/entities/membre-struct.entity';
import { Structure } from '@/structure/entities/structure.entity';

export class UpdateProjetDto extends PartialType(CreateProjetDto) {
            
                    @IsOptional()
                    libelleprojet:string
                    
                    @IsOptional()
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
                    etatprojet:string
                    
                    @IsOptional()
                    nomStructure:string
            
            
            
            
            
            
                    @Type(() => MembreStruct)
                    membreStruct:MembreStruct
        
                    @Type(()=>Structure)
                    structure:Structure
}
