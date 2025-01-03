import { Module } from '@nestjs/common';
import { ProjetService } from './projet.service';
import { ProjetController } from './projet.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Projet } from './entities/projet.entity';

@Module({

  imports : [TypeOrmModule.forFeature([Projet])],
  controllers: [ProjetController],
  providers: [ProjetService],
  exports:[ProjetService]
})
export class ProjetModule {}
