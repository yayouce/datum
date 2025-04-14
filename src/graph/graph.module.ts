import { Module } from '@nestjs/common';
import { GraphService } from './graph.service';
import { GraphController } from './graph.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Graph } from './entities/graph.entity';
import { SourceDonneesModule } from 'src/source_donnees/source_donnees.module';
import { GeoService } from './geospatiale.service';

@Module({
  imports:[TypeOrmModule.forFeature([Graph]),SourceDonneesModule],
  controllers: [GraphController],
  providers: [GraphService,GeoService],
  exports:[GraphService]
})
export class GraphModule {}
