import { Module } from '@nestjs/common';
import { SourceDonneesService } from './source_donnees.service';
import { SourceDonneesController } from './source_donnees.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SourceDonnee } from './entities/source_donnee.entity';
import { UnitefrequenceModule } from 'src/frequence/unitefrequence.module';
import { DataTypeModule } from 'src/data_type/data_type.module';
import { FormatfichierModule } from 'src/formatfichier/formatfichier.module';
import { EnqueteModule } from 'src/enquete/enquete.module';
import { FileHandlerService } from 'src/utils/file-handler.service';
import { DataTypeService } from 'src/data_type/data_type.service';

@Module({
  imports: [TypeOrmModule.forFeature([SourceDonnee]),UnitefrequenceModule,DataTypeModule,FormatfichierModule,EnqueteModule],
  controllers: [SourceDonneesController],
  providers: [SourceDonneesService,FileHandlerService],
})
export class SourceDonneesModule {}
