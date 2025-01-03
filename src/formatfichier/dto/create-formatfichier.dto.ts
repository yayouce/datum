import { IsNotEmpty, IsString } from "class-validator";

export class CreateFormatfichierDto {
    @IsNotEmpty()
    @IsString()
    libelleFormat
}
