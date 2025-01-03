import { PartialType } from '@nestjs/swagger';
import { UnitefrequenceDto } from './create-data_type.dto';

export class UpdateunitefrequenceDto extends PartialType(UnitefrequenceDto) {}
