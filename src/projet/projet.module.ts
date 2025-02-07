import { Module } from '@nestjs/common';
import { ProjetService } from './projet.service';
import { ProjetController } from './projet.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Projet } from './entities/projet.entity';
import { Structure } from '@/structure/entities/structure.entity';
import { StructureModule } from '@/structure/structure.module';

@Module({

  imports : [TypeOrmModule.forFeature([Projet]),StructureModule],
  controllers: [ProjetController],
  providers: [ProjetService],
  exports:[ProjetService]
})
export class ProjetModule {}
