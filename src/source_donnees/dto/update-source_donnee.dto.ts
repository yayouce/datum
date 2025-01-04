import { PartialType } from '@nestjs/swagger';
import { CreateSourceDonneeDto } from './create-source_donnee.dto';

export class UpdateSourceDonneeDto extends PartialType(CreateSourceDonneeDto) {}
