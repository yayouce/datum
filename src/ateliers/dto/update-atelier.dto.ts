import { PartialType } from '@nestjs/swagger';
import { CreateAtelierDto } from './create-atelier.dto';

export class UpdateAtelierDto extends PartialType(CreateAtelierDto) {}
