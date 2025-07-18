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
import { HttpModule } from '@nestjs/axios';
import { ProjetModule } from '@/projet/projet.module';
import { StructureModule } from '@/structure/structure.module';
import { UserModule } from '@/user/user.module';
import { Projet } from '@/projet/entities/projet.entity';
import { UserEntity } from '@/user/entities/user.entity';
// import { SourceAutoSyncService } from './source-auto-sync.service';

@Module({
  imports: [TypeOrmModule.forFeature([SourceDonnee,Projet,UserEntity]),UnitefrequenceModule,DataTypeModule,FormatfichierModule,HttpModule,EnqueteModule,ProjetModule, StructureModule,UserModule],
  controllers: [SourceDonneesController],
  providers: [SourceDonneesService,FileHandlerService],
  exports:[SourceDonneesService]
})
export class SourceDonneesModule {}
