import { PartialType } from '@nestjs/swagger';
import { CreateEnqueteDto } from './create-enquete.dto';

export class UpdateEnqueteDto extends PartialType(CreateEnqueteDto) {}
