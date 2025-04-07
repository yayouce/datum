  // import { Injectable, Logger } from '@nestjs/common';
  // import { Cron, CronExpression } from '@nestjs/schedule';
  // import { OnModuleInit } from '@nestjs/common';
  // import { HttpService } from '@nestjs/axios';
  // import { firstValueFrom } from 'rxjs';
  // import * as path from 'path';
  // import * as fs from 'fs';
  // import { IsNull, Not, Repository } from 'typeorm';
  // import { SourceDonnee } from './entities/source_donnee.entity';
  // import { FormatfichierService } from '@/formatfichier/formatfichier.service';

  // @Injectable()
  // export class SourceAutoSyncService {
  //   private readonly logger = new Logger(SourceAutoSyncService.name);

  //   constructor(
    
  //     private readonly httpService: HttpService,
  //     private readonly formatservice: FormatfichierService
  //   ) {}

  //   OnModuleInit() {
  //     this.logger.log('🚀 [CRON INIT] SourceAutoSyncService initialisé. Synchronisation automatique activée toutes les 5 minutes.');
  //   }

  //   @Cron(CronExpression.EVERY_10_SECONDS) 
  //   async autoSyncSources() {
  //     console.log(' Synchronisation automatique des sources en cours...');

  //     const sources = await this.sourcededonneesrepo.find({
  //       where: { source: Not(IsNull()) },
  //     });

  //     for (const source of sources) {
  //       if (!source.source.startsWith('https')) continue;

  //       try {
  //         const { fichier, format } = await this.updateFileFromSource(source.source);

  //         source.fichier = fichier;
  //         source.format = format;
  //         source.libelleformat = format.libelleFormat;
  //         source.source=source.source

  //         await this.sourcededonneesrepo.save(source);
  //         console.log(`✅ Source mise à jour : ${source.nomSource}`);
  //       } catch (error) {
  //         console.warn(`⚠️ Échec maj pour ${source.source} : ${error.message}`);
  //       }
  //     }

  //     console.log('✅ Synchronisation terminée.');
  //   }

  //   private async updateFileFromSource(sourceUrl: string): Promise<{ fichier: any, format: any }> {
  //     const response = await firstValueFrom(this.httpService.get(sourceUrl, { responseType: 'arraybuffer' }));

  //     if (!response.data) throw new Error(`Aucune donnée depuis ${sourceUrl}`);

  //     const formatFichier = path.extname(sourceUrl).replace('.', '').toLowerCase();
  //     const filePath = path.join(__dirname, `temp_auto.${formatFichier}`);
  //     fs.writeFileSync(filePath, response.data);

  //     let fichier = null;
  //     if (formatFichier === 'xlsx') {
  //       fichier = this.processExcelFile(filePath);
  //     } else if (formatFichier === 'csv') {
  //       fichier = await this.processCsvFile(filePath);
  //     } else if (formatFichier === 'json') {
  //       fichier = this.processJsonFile(filePath);
  //     } else {
  //       throw new Error(`Format non supporté : ${formatFichier}`);
  //     }

  //     fs.unlinkSync(filePath);

  //     const format = await this.formatservice.getoneByLibelle(formatFichier);
  //     if (!format) throw new Error(`Format introuvable : ${formatFichier}`);

  //     return { fichier, format };
  //   }


  //   private processExcelFile(filePath: string): any { /* ... */ }
  //   private async processCsvFile(filePath: string): Promise<any> { /* ... */ }
  //   private processJsonFile(filePath: string): any { /* ... */ }
  // }
