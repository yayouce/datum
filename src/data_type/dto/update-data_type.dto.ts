import { PartialType } from '@nestjs/swagger';
import { CreateDataTypeDto } from './create-data_type.dto';

export class UpdateDataTypeDto extends PartialType(CreateDataTypeDto) {}
