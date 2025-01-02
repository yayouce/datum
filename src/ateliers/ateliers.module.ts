import { Module } from '@nestjs/common';
import { AteliersService } from './ateliers.service';
import { AteliersController } from './ateliers.controller';

@Module({
  controllers: [AteliersController],
  providers: [AteliersService],
})
export class AteliersModule {}
