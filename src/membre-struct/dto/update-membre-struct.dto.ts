import { PartialType } from '@nestjs/swagger';
import { CreateMembreStructDto } from './create-membre-struct.dto';

export class UpdateMembreStructDto extends PartialType(CreateMembreStructDto) {}
