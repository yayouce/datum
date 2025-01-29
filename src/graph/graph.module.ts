import { Module } from '@nestjs/common';
import { GraphService } from './graph.service';
import { GraphController } from './graph.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Graph } from './entities/graph.entity';
import { SourceDonnee } from 'src/source_donnees/entities/source_donnee.entity';
import { SourceDonneesModule } from 'src/source_donnees/source_donnees.module';

@Module({
  imports:[TypeOrmModule.forFeature([Graph]),SourceDonneesModule],
  controllers: [GraphController],
  providers: [GraphService],
  exports:[GraphService]
})
export class GraphModule {}
