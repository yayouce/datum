import { IsNotEmpty, IsString } from "class-validator";
export class CreateDataTypeDto {
        @IsNotEmpty()
        @IsString()
        libelledatatype
    }
    
