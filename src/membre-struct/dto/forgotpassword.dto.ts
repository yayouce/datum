import { PartialType } from '@nestjs/swagger';
import { CreateMembreStructDto } from './create-membre-struct.dto';
import { IsNotEmpty, IsString } from 'class-validator';

export class ForgotmembrePassword extends PartialType(CreateMembreStructDto) {

    @IsNotEmpty()
    @IsString()
    email:string
}
