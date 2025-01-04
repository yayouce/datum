import { Module } from '@nestjs/common';
import { SourceDonneesService } from './source_donnees.service';
import { SourceDonneesController } from './source_donnees.controller';

@Module({
  controllers: [SourceDonneesController],
  providers: [SourceDonneesService],
})
export class SourceDonneesModule {}
