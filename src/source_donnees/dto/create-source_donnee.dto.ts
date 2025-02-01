import { Type } from "class-transformer"
import { IsNotEmpty, IsNumber, IsOptional, IsString, ValidateIf } from "class-validator"
import { DataType } from "src/data_type/entities/data_type.entity"
import { Enquete } from "src/enquete/entities/enquete.entity"
import { Formatfichier } from "src/formatfichier/entities/formatfichier.entity"
import { unitefrequence } from "src/frequence/entities/unitefrequence.entity"


export class CreateSourceDonneeDto {

        @IsNotEmpty()
        @IsString()
        libelletypedonnees:string;

        @IsNotEmpty()
        @IsString()
        nomSource:string
    
        @IsNotEmpty()
        @IsString()
        commentaire:string
    
        
        @IsNotEmpty()
        @IsString()
        libelleformat:string
        
        @IsOptional()
        @IsString()
        libelleunite:string;
        
        
        @IsOptional() //cas API seulement
        @IsNumber()
        frequecnce:number
        
        @ValidateIf((o) => !o.source)
        // @IsBuffer({ message: "Le fichier doit être un Buffer valide." })
        @IsOptional()
        fichier:any
        
        @ValidateIf((o) => !o.fichier)
        @IsNotEmpty({ message: "Le lien source est obligatoire si aucun fichier n'est fourni." })
        @IsString()
        @IsOptional()
        source:string
        
        @IsOptional()    //cas ApI seulement
        @Type(() => unitefrequence)
        unitefrequence:unitefrequence
        
        @IsOptional()
        @Type(() => Formatfichier)
        format:Formatfichier
        
        @IsOptional()
        @Type(() => DataType)
        typedonnes:DataType
        @IsOptional()
        @Type(() => Enquete)
        enquete:Enquete


    
        
    }
    
    
    
    