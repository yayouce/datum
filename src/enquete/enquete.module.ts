import { Module } from '@nestjs/common';
import { EnqueteService } from './enquete.service';
import { EnqueteController } from './enquete.controller';

@Module({
  controllers: [EnqueteController],
  providers: [EnqueteService],
})
export class EnqueteModule {}
