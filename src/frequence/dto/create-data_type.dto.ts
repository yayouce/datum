import { IsNotEmpty, IsString } from "class-validator";
export class UnitefrequenceDto {
        @IsNotEmpty()
        @IsString()
        libelleunitefrequence
    }
    
    