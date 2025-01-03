import { PartialType } from '@nestjs/swagger';
import { CreateFormatfichierDto } from './create-formatfichier.dto';

export class UpdateFormatfichierDto extends PartialType(CreateFormatfichierDto) {}
