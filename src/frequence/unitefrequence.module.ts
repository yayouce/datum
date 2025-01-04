import { Module } from '@nestjs/common';
import { UnitefrequenceService } from './unitefrequence.service';
import { UnitefrequenceController } from './unitefrequence.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { unitefrequence } from './entities/unitefrequence.entity';


@Module({
  imports:[TypeOrmModule.forFeature([unitefrequence])],
  controllers: [UnitefrequenceController],
  providers: [UnitefrequenceService],
})
export class UnitefrequenceModule {}
