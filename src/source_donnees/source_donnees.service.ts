import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateSourceDonneeDto } from './dto/create-source_donnee.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { SourceDonnee } from './entities/source_donnee.entity';
import { IsNull, Not, Repository } from 'typeorm';
import { DataTypeService } from 'src/data_type/data_type.service';
import { FormatfichierService } from 'src/formatfichier/formatfichier.service';
import { UnitefrequenceService } from 'src/frequence/unitefrequence.service';
import { EnqueteService } from 'src/enquete/enquete.service';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { FileHandlerService } from 'src/utils/file-handler.service';
import { getSheetOrDefault } from './getSheetOrdefault';
import { generateNextColumnLetter } from './generateNextColumnLetter';
import { addColumnDto } from './dto/addcolumn.dto';
import { modifyColumnDto } from './dto/modify.dto';
import { removeColumnDto } from './dto/removeclumn.dto';
import { ApplyFunctionDto } from './dto/ApplyFunctionDto.dto';
import { UpdateSourceDonneeDto } from './dto/update-source_donnee.dto';
import { modifyCellDto } from './dto/modifyCell.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OnModuleInit } from '@nestjs/common';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';
import { ProjetService } from '@/projet/projet.service';
import { JoinSourcesDto } from './dto/jointure.dto';
import { evaluate,compare  } from 'mathjs'
import { ApplyfunctionDto2 } from './dto/Applyfunction.dto';
import { MasqueColumnToggleDto } from './dto/masquercolonne.dto';
import { UpdateAutorisationsDto } from './dto/update-autorisations.dto';

import { AutorisationsSourceDonnee } from '@/utils/autorisation';
import { MembreStruct } from '@/membre-struct/entities/membre-struct.entity';
import { StructureService } from '@/structure/structure.service';
import { UserService } from '@/user/user.service';
import { UserEntity } from '@/user/entities/user.entity';
import { Projet } from '@/projet/entities/projet.entity';
import { checkAdminAccess } from '@/utils/auth.utils';
import { roleMembreEnum } from '@/generique/rolemembre.enum';
import { UserPermissionToggleDto } from './dto/update-autorisation.dto';
import { UserRole } from '@/generique/userroleEnum';
import { detectFileFormat, processCsvFile, processExcelFile, processJsonFile } from './utils/conversionFichier';
import { getExcelColumnName } from './utils/generernomcolonne';

import * as JoinHelpers from './utils/join.helpers';
import * as StreamHelpers from './utils/stream.helpers';
type AuthenticatedUser = {
  iduser: string;
  role: 'admin' | 'client';
  roleMembre?: string; // seulement si role === 'client'
  structure?: { idStruct: string }; // seulement si role === 'client'
};

@Injectable()
export class SourceDonneesService implements OnModuleInit {
  membreStructRepository: any;

  private readonly logger = new Logger(SourceDonneesService.name); 
  private readonly tempDir: string; 
  constructor(
    @InjectRepository(SourceDonnee)
    private sourcededonneesrepo: Repository<SourceDonnee>,
    private datatypeservice: DataTypeService,
    private formatservice: FormatfichierService,
    private unitefrequence: UnitefrequenceService,
    private enqueteservice: EnqueteService,
    private projetservice:ProjetService,
    private fileHandlerService: FileHandlerService,
    private readonly httpService: HttpService,
    private structureservice:StructureService,
  @InjectRepository(UserEntity)
    private userrepo: Repository<UserEntity>,
    private userservice:UserService,
    @InjectRepository(Projet)
    private readonly projetRepo: Repository<Projet>,
  
  ) {
     this.tempDir = path.resolve(process.cwd(), 'temp_cron_files');
    if (!fs.existsSync(this.tempDir)) {
      try {
        fs.mkdirSync(this.tempDir, { recursive: true });
        this.logger.log(`Répertoire temporaire créé : ${this.tempDir}`);
      } catch (error) {
        this.logger.error(`Impossible de créer le répertoire temporaire ${this.tempDir}: `, error.stack);
  
      }
    }
  }


  @Cron(CronExpression.EVERY_MINUTE,{ name: 'sync' }) // Si ce service est aussi le scheduler
  async handleCron() {
    this.logger.log('CRON: Démarrage du rafraîchissement automatique des sources de données.');
    await this.refreshSourcesAuto3(); // Appel de la méthode de ce service
    this.logger.log('CRON: Rafraîchissement automatique des sources de données terminé.');
  }



  onModuleInit() {
    console.log('[INIT] SourceDonneesService initialisé. Lancement de la première synchronisation...');
    this.refreshSourcesAuto3();
  }
  async findOneById(id: string): Promise<SourceDonnee | null> {
  
    return this.sourcededonneesrepo.findOne({ where: { idsourceDonnes: id } });
}

  async CreationSourcededonnees(data: CreateSourceDonneeDto, idenquete: string) {
    try {
      const { libelleformat, libelletypedonnees, libelleunite, source, ...reste } = data;

      // 1. Récupération des entités associées
      const typedonnees = await this.datatypeservice.getoneByLibelle(libelletypedonnees);
      
      const unitefrequence = libelleunite ? await this.unitefrequence.getoneBylibelle(libelleunite) : null;
      const enquetedata = await this.enqueteservice.getenqueteByID(idenquete);
      let fichier = data.fichier; 
      let formatFichier = null; 

  
      if (source) {
        try {
          const response = await firstValueFrom(this.httpService.get(source, { responseType: 'arraybuffer' }));
        
          if (!response.data) {
            throw new HttpException(`L'API ${source} ne retourne pas de fichier valide`, 803);
          }
          formatFichier = detectFileFormat(source);
          // Convertir le buffer en fichier temporaire
          const filePath = path.join(__dirname, `temp.${formatFichier}`);
          fs.writeFileSync(filePath, response.data);

          // Lire et formater le fichier selon son type
          if (formatFichier === 'xlsx') {
            fichier = processExcelFile(filePath);
          } else if (formatFichier === 'csv') {
            fichier = await processCsvFile(filePath);
          } else if (formatFichier === 'json') {
            fichier = processJsonFile(filePath);
          } else {
            throw new HttpException(`Format de fichier non supporté: ${formatFichier}`, 804);
          }

          //  Supprimer le fichier temporaire après traitement
          fs.unlinkSync(filePath);
        } catch (error) {
          throw new HttpException(`Impossible de récupérer ou traiter les données depuis ${source}: ${error.message}`, 802);
        }
      }
      const format = await this.formatservice.getoneByLibelle(formatFichier);

      // 3. Création de l'entité SourceDonnee avec les données formatées
      const newsourcedonnes = this.sourcededonneesrepo.create({
        ...reste,
        enquete: enquetedata,
        libelleformat: format.libelleFormat,
        libelletypedonnees: typedonnees.libelledatatype,
        libelleunite: unitefrequence ? unitefrequence.libelleunitefrequence : null,
        typedonnes: typedonnees,
        unitefrequence: unitefrequence,
        format: format,
        source:source,
        fichier: fichier, 
      });

      // 4. Sauvegarde dans la base de données
      return await this.sourcededonneesrepo.save(newsourcedonnes);
    } catch (err) {
      throw new HttpException(err.message, 801);
    }
  }



async joinSources2(
    idprojet: string,
    joinSourcesDto: JoinSourcesDto,
  ): Promise<SourceDonnee> {
    const { source1, source2, sheet1, sheet2, key1, key2 } = joinSourcesDto;

    // ÉTAPE 1: EXTRACTION
    const { sourceData1, sourceData2 } = await JoinHelpers.fetchSourcePair(this.sourcededonneesrepo, source1, source2, idprojet);
    
    const fichierA = sourceData1.fichier;
    const fichierB = sourceData2.fichier;

    if (!fichierA[sheet1] || !fichierB[sheet2]) {
      throw new HttpException("Une des feuilles sélectionnées n'existe pas dans la source.", 804);
    }

    // ÉTAPE 2: PRÉPARATION DES DONNÉES
    const { headerNames: headerNamesA, rows: dataA, keyColumnName: keyColumnA } = JoinHelpers.extractSheetData(fichierA[sheet1].donnees, key1);
    const { headerNames: headerNamesB, rows: dataB, keyColumnName: keyColumnB } = JoinHelpers.extractSheetData(fichierB[sheet2].donnees, key2);

    // ÉTAPE 3: LOGIQUE DE JOINTURE
    const joinedData = JoinHelpers.performFullOuterJoin({
      dataA, keyColumnA, headerNamesA,
      dataB, keyColumnB, headerNamesB,
    });

    if (joinedData.length === 0) {
      throw new HttpException("La jointure n'a produit aucun résultat.", 805);
    }

    // ÉTAPE 4: REFORMATAGE POUR STOCKAGE
    const { donnees, colonnes } = JoinHelpers.formatJoinedDataForStorage(joinedData, headerNamesA, headerNamesB);

    // ÉTAPE 5: CRÉATION ET SAUVEGARDE DE L'ENTITÉ
    const newSource = new SourceDonnee();
    newSource.nomSource = `jointure_full_${source1}-${source2}`;
    newSource.commentaire = `Jointure complète (FULL OUTER) de la base ${source1} et de la base ${source2}`;
    newSource.libelleformat = sourceData1.libelleformat;
    newSource.libelletypedonnees = sourceData1.libelletypedonnees;
    newSource.format = sourceData1.format;
    newSource.enquete = sourceData1.enquete;
    newSource.fichier = {
      ["sheet_fusion"]: { donnees, colonnes },
    };
    newSource.bd_jointes = {
      source1: sourceData1.idsourceDonnes,
      source2: sourceData2.idsourceDonnes,
      key1: `${key1}_${sheet1}`,
      key2: `${key2}_${sheet2}`,
    };

    return await this.sourcededonneesrepo.save(newSource);
  }



async getBdsByJointureOne(idSourceJointe: string): Promise<{ source1: SourceDonnee; source2: SourceDonnee }> {

  const sourceJointe = await this.sourcededonneesrepo.findOne({
    where: { idsourceDonnes: idSourceJointe },
  });

  if (!sourceJointe) {
    throw new HttpException(`Aucune base de données jointe trouvée pour l'ID ${idSourceJointe}`,805);
  }

  // Vérifier que la base jointe contient bien des références `bd_jointes`
  if (!sourceJointe.bd_jointes || !sourceJointe.bd_jointes.source1 || !sourceJointe.bd_jointes.source2) {
    throw new HttpException(`Les bases de données sources ne sont pas disponibles pour cette jointure.`,805);
  }

  //  Récupérer les bases sources ayant participé à cette jointure
  const source1 = await this.sourcededonneesrepo.findOne({ where: { idsourceDonnes: sourceJointe.bd_jointes.source1 } });
  const source2 = await this.sourcededonneesrepo.findOne({ where: { idsourceDonnes: sourceJointe.bd_jointes.source2 } });

  if (!source1 || !source2) {
    throw new HttpException(`Impossible de retrouver l'une des bases de données sources.`,805);
  }

  return { source1, source2 };
}

async updateSourceDonnees(
  idsourceDonnes: string,
  data: UpdateSourceDonneeDto
) {
  try {
    // 1. Vérifier si la source de données existe
    const sourceExistante = await this.sourcededonneesrepo.findOne({
      where: { idsourceDonnes },
      relations: ["format", "typedonnes", "unitefrequence", "enquete"],
    });

    if (!sourceExistante) {
      throw new HttpException("Source de données non trouvée", 701);
    }

    // 2. Récupérer les nouvelles valeurs des entités associées si elles sont fournies
    const { libelleformat, libelletypedonnees, libelleunite, source, ...reste } = data;

    if (libelletypedonnees) {
      const typedonnees = await this.datatypeservice.getoneByLibelle(libelletypedonnees);
      if (!typedonnees) throw new HttpException("Type de données introuvable", 703);
      sourceExistante.typedonnes = typedonnees;
      sourceExistante.libelletypedonnees = typedonnees.libelledatatype;
    }

    if (libelleformat) {
      const format = await this.formatservice.getoneByLibelle(libelleformat);
      if (!format) throw new HttpException("Format introuvable", 704);
      sourceExistante.format = format;
      sourceExistante.libelleformat = format.libelleFormat;
    }

    if (libelleunite) {
      const unitefrequence = await this.unitefrequence.getoneBylibelle(libelleunite);
      if (!unitefrequence) throw new HttpException("Unité de fréquence introuvable", 702);
      sourceExistante.unitefrequence = unitefrequence;
      sourceExistante.libelleunite = unitefrequence.libelleunitefrequence;
    }

    // 3. Mettre à jour les autres champs
    Object.assign(sourceExistante, reste);

    // 3.5 Mise à jour dynamique du fichier source si une nouvelle URL est fournie
    if (source) {
      try {
        const response = await firstValueFrom(this.httpService.get(source, { responseType: 'arraybuffer' }));

        if (!response.data) {
          throw new HttpException(`L'API ${source} ne retourne pas de fichier valide`, 706);
        }

        const formatFichier = detectFileFormat(source);
        const filePath = path.join(__dirname, `temp_update.${formatFichier}`);
        fs.writeFileSync(filePath, response.data);

        let fichier = null;
        if (formatFichier === 'xlsx') {
          fichier = processExcelFile(filePath);
        } else if (formatFichier === 'csv') {
          fichier = await processCsvFile(filePath);
        } else if (formatFichier === 'json') {
          fichier = processJsonFile(filePath);
        } else {
          throw new HttpException(`Format de fichier non supporté: ${formatFichier}`, 707);
        }

        fs.unlinkSync(filePath); // 🧹 Supprimer le fichier temporaire

        const format = await this.formatservice.getoneByLibelle(formatFichier);
        if (!format) throw new HttpException("Format introuvable", 708);

        sourceExistante.bd_normales = fichier;
        sourceExistante.format = format;
        sourceExistante.libelleformat = format.libelleFormat;
      } catch (error) {
        throw new HttpException(`Erreur lors de la mise à jour du fichier source : ${error.message}`, 709);
      }
    }

    // 4. Sauvegarder la mise à jour
    return await this.sourcededonneesrepo.save(sourceExistante);
  } catch (err) {
    throw new HttpException(err.message, 705);
  }


  }



private isTimeToUpdate(sourceDonnee: SourceDonnee): boolean {
    if (!sourceDonnee.frequence || !sourceDonnee.libelleunite) {
      this.logger.log(`Mise à jour en cours pour ${sourceDonnee.nomSource}`);
      // this.logger.verbose(`Source ${sourceDonnee.nomSource} (ID: ${sourceDonnee.idsourceDonnes}) : configuration de fréquence manquante.`);
      return false;
    }

    const derniereMiseAJourReussie = sourceDonnee.derniereMiseAJourReussieSource; 

    if (!derniereMiseAJourReussie) {
      this.logger.log(`Source ${sourceDonnee.nomSource} (ID: ${sourceDonnee.idsourceDonnes}): Première mise à jour nécessaire.`);
      return true;
    }

    const derniereMajDate = new Date(derniereMiseAJourReussie);
    const maintenant = new Date();
    let prochainCheck = new Date(derniereMajDate);

    const frequence = sourceDonnee.frequence;
    const unite = sourceDonnee.libelleunite;

    switch (unite) {
      case 'Minutes':
      case 'minute':
        prochainCheck.setMinutes(derniereMajDate.getMinutes() + frequence);
        break;
      case 'Heures':
      case 'heure':
        prochainCheck.setHours(derniereMajDate.getHours() + frequence);
        break;
      case 'Jours':
      case 'jour':
        prochainCheck.setDate(derniereMajDate.getDate() + frequence);
        break;
      case 'Seconds':
      case 'seconds':
        prochainCheck.setSeconds(derniereMajDate.getDate() + frequence);
        break;
      default:
        this.logger.warn(`Unité de fréquence '${unite}' non reconnue pour ${sourceDonnee.nomSource} (ID: ${sourceDonnee.idsourceDonnes}).`);
        return false;
    }
    
    const decision = maintenant >= prochainCheck;
    if(decision) {
        this.logger.log(`Source ${sourceDonnee.nomSource} (ID: ${sourceDonnee.idsourceDonnes}): Mise à jour requise. Prochain check était à ${prochainCheck.toISOString()}`);
    }
    return decision;
  }





// async refreshSourcesAuto2(): Promise<void> {
//     const sources = await this.sourcededonneesrepo.find({
//       where: { 
//         source: Not(IsNull()),      // Doit avoir une URL source
//         frequence: Not(IsNull()),   // Et une fréquence
//         libelleunite: Not(IsNull()) // Et une unité
//       },
//       relations: ['format', 'typedonnes', 'unitefrequence' /* Ajoutez d'autres relations si besoin pour le traitement */],
//     });

//     this.logger.log(`Vérification de ${sources.length} source(s) de données potentielle(s) pour rafraîchissement.`);

//     for (const sourceDonnee of sources) {
    
//       // sourceDonnee.derniereMiseAJourReussieSource = new Date();

//       if (!this.isTimeToUpdate(sourceDonnee)) {
//         // Pas besoin de sauvegarder si on ne fait rien, sauf si vous voulez mettre à jour derniereTentativeMiseAJourSource
//         if (sourceDonnee.derniereMiseAJourReussieSource) await this.sourcededonneesrepo.save(sourceDonnee);
//         continue;
//       }

      
      
//       this.logger.log(`Traitement de la source: ${sourceDonnee.nomSource} (ID: ${sourceDonnee.idsourceDonnes}, URL: ${sourceDonnee.source})`);

//       if (!sourceDonnee.source || !sourceDonnee.source.startsWith('http')) {
//         this.logger.warn(`URL source invalide pour ${sourceDonnee.nomSource}: ${sourceDonnee.source}. Mise à jour de la date de tentative.`);
//         //await this.sourcededonneesrepo.save(sourceDonnee); // Sauvegarder la date de tentative
//         continue;
//       }

//       try {
//         const response = await firstValueFrom(
//           this.httpService.get(sourceDonnee.source, { responseType: 'arraybuffer', timeout: 60000 }) // Timeout 60s
//         );

//         if (!response || !response.data || response.data.byteLength === 0) {
//           this.logger.warn(`Aucune donnée ou fichier vide pour ${sourceDonnee.nomSource} depuis ${sourceDonnee.source}.`);
//           await this.sourcededonneesrepo.save(sourceDonnee); // Sauvegarder la date de tentative
//           continue;
//         }

//         const formatFichier = detectFileFormat(sourceDonnee.source);
//         if (!formatFichier) {
//             this.logger.error(`Format de fichier non détecté ou non supporté pour ${sourceDonnee.source}.`);
//              await this.sourcededonneesrepo.save(sourceDonnee);
//             continue;
//         }

//         const tempFileName = `temp_auto_cron_${sourceDonnee.idsourceDonnes}_${Date.now()}.${formatFichier}`;
//         const filePath = path.join(this.tempDir, tempFileName);
        
//         fs.writeFileSync(filePath, Buffer.from(response.data)); // Utiliser Buffer.from
//         this.logger.log(`Fichier temporaire écrit: ${filePath} pour ${sourceDonnee.nomSource}`);

//         let fichierTraite = null;
//         if (formatFichier === 'xlsx') {
//           fichierTraite = processExcelFile(filePath);
//         } else if (formatFichier === 'csv') {
//           fichierTraite = await processCsvFile(filePath);
//         } else if (formatFichier === 'json') {
//           fichierTraite = processJsonFile(filePath);
//         } else {
//           this.logger.error(`Format de fichier '${formatFichier}' non supporté pour traitement (source: ${sourceDonnee.source}).`);
//           fs.unlinkSync(filePath);
//           await this.sourcededonneesrepo.save(sourceDonnee);
//           continue;
//         }

//         try {
//               fs.unlinkSync(filePath);
//               this.logger.log(`Fichier temporaire supprimé: ${filePath}`);
//             } catch (err) {
//               this.logger.warn(`Impossible de supprimer le fichier temporaire ${filePath}: ${err.message}`);
//             }
//         // Utilisez votre service pour récupérer l'entité Formatfichier
//         const format = await this.formatservice.getoneByLibelle(formatFichier); 
//         if (!format) {
//           this.logger.error(`Entité Formatfichier introuvable en base pour le libellé: '${formatFichier}'.`);
//           // await this.sourcededonneesrepo.save(sourceDonnee);
//           continue;
//         }

//         // Mettre à jour uniquement les champs liés au fichier
//         sourceDonnee.fichier = fichierTraite; // ou sourceDonnee.fichier, selon celui que vous voulez mettre à jour
//         sourceDonnee.format = format;
//         sourceDonnee.libelleformat = format.libelleFormat; // Assurez-vous que 'libelleFormat' est le bon nom de propriété sur Formatfichier

//         // **CHOIX ICI (si vous avez ajouté derniereMiseAJourReussieSource): **
//         sourceDonnee.derniereMiseAJourReussieSource = new Date(); 

//         // `updatedAt` sera mis à jour automatiquement par TypeORM grâce à TimestampEntites
//         await this.sourcededonneesrepo.save(sourceDonnee);
//         this.logger.log(`SUCCÈS: Source ${sourceDonnee.nomSource} (ID: ${sourceDonnee.idsourceDonnes}) mise à jour.`);

//       } catch (error) {
//         this.logger.error(`ERREUR lors du traitement de ${sourceDonnee.nomSource} (ID: ${sourceDonnee.idsourceDonnes}, URL: ${sourceDonnee.source}): ${error.message}`, error.stack)
//       }
//     }
//     this.logger.log('Fin de la vérification des sources de données pour rafraîchissement.');
//   }

  async refreshSourcesAuto3(): Promise<void> {
    const sources = await this.sourcededonneesrepo.find({
      where: { source: Not(IsNull()), frequence: Not(IsNull()), libelleunite: Not(IsNull()) },
      relations: ['format', 'typedonnes', 'unitefrequence'],
    });

    this.logger.log(`Vérification de ${sources.length} source(s) pour rafraîchissement.`);

    for (const sourceDonnee of sources) {
      if (!this.isTimeToUpdate(sourceDonnee)) {
        continue;
      }
      this.logger.log(`Traitement source: ${sourceDonnee.nomSource} (ID: ${sourceDonnee.idsourceDonnes})`);

      if (!sourceDonnee.source || !sourceDonnee.source.startsWith('http')) {
        this.logger.warn(`URL invalide pour ${sourceDonnee.nomSource}: ${sourceDonnee.source}.`);
        continue;
      }

      let filePath = '';
      try {
        const formatFichier = detectFileFormat(sourceDonnee.source);
        if (!formatFichier) {
          this.logger.error(`Format non détecté pour ${sourceDonnee.source}.`);
          continue;
        }

        const tempFileName = `temp_refresh_${sourceDonnee.idsourceDonnes}_${Date.now()}.${formatFichier}`;
        filePath = path.join(this.tempDir, tempFileName);

        // ÉTAPE 1: Téléchargement en streaming
        this.logger.log(`Téléchargement en streaming vers ${filePath}...`);
        await StreamHelpers.downloadFileAsStream(sourceDonnee.source, filePath);
        this.logger.log('Téléchargement terminé.');

        // ÉTAPE 2: Parsing en streaming depuis le fichier
        let fichierTelechargeTraite = null;
        this.logger.log(`Parsing en streaming du fichier ${formatFichier}...`);
        if (formatFichier === 'xlsx') {
            fichierTelechargeTraite = await StreamHelpers.processExcelStream(filePath);
        } else if (formatFichier === 'csv') {
            // Note: processCsvStream doit être complété pour correspondre à votre structure de données
            fichierTelechargeTraite = await StreamHelpers.processCsvStream(filePath);
        } else if (formatFichier === 'json') {
            // Pour le JSON, la lecture en stream est possible mais plus complexe.
            // Pour l'instant, on peut le lire de manière classique car c'est moins courant.
            const jsonData = fs.readFileSync(filePath, 'utf-8');
            fichierTelechargeTraite = processJsonFile(JSON.parse(jsonData)); // en supposant que processJsonFile existe
        } else {
          this.logger.error(`Format '${formatFichier}' non supporté pour le streaming.`);
          continue;
        }
        this.logger.log('Parsing terminé.');

        // ----- DÉBUT DE LA LOGIQUE DE FUSION BASÉE SUR LES EN-TÊTES DE COLONNES -----
        if ((formatFichier === 'xlsx' || formatFichier === 'csv') && fichierTelechargeTraite) {
    const ancienFichierComplet = sourceDonnee.fichier || {};
    const fichierResultatFusion = {};

    // Helper 1: Génère un nom de colonne Excel (A, B, ..., Z, AA, AB, ...)
    const getExcelColumnName = (index: number): string => {
        let name = '';
        let i = index;
        while (i >= 0) {
            name = String.fromCharCode(i % 26 + 'A'.charCodeAt(0)) + name;
            i = Math.floor(i / 26) - 1;
        }
        return name;
    };

    // Helper 2: Extrait les informations de la feuille de manière robuste
    const extraireInfosFeuille = (sheetData: any) => {
        if (!sheetData?.donnees?.length) {
            return { headers: [], dataRows: [] };
        }
        const headerRowObj = sheetData.donnees[0] || {};
        const headers: { name: string; colId: string }[] = [];
        const excelColIds = sheetData.colonnes || [];

        excelColIds.forEach(colId => {
            const headerCellKey = `${colId}1`;
            // On inclut la colonne même si son nom est vide, pour préserver la structure.
            const name = headerRowObj.hasOwnProperty(headerCellKey) ? String(headerRowObj[headerCellKey]) : `Colonne_${colId}`;
            headers.push({ name, colId });
        });

        return { headers, dataRows: sheetData.donnees.slice(1) };
    };

    // Helper 3: Rend les noms d'en-tête uniques en ajoutant des suffixes
    const generateUniqueHeaders = (headers: { name: string; colId: string }[]) => {
        const counts = new Map<string, number>();
        return headers.map(header => {
            const currentCount = counts.get(header.name) || 0;
            counts.set(header.name, currentCount + 1);
            const uniqueName = currentCount > 0 ? `${header.name}_${currentCount + 1}` : header.name;
            return { ...header, uniqueName };
        });
    };

    // Boucle de fusion principale
    for (const sheetName in fichierTelechargeTraite) {
        if (!fichierTelechargeTraite.hasOwnProperty(sheetName)) continue;
        this.logger.log(`Début fusion feuille '${sheetName}' pour ${sourceDonnee.nomSource}`);

        const infosNouveau = extraireInfosFeuille(fichierTelechargeTraite[sheetName]);
        const infosAncien = extraireInfosFeuille(ancienFichierComplet[sheetName] || {});

        if (infosNouveau.headers.length === 0) {
            this.logger.warn(`Nouvelle feuille '${sheetName}' est vide. Conservation de l'ancienne si existante.`);
            fichierResultatFusion[sheetName] = ancienFichierComplet[sheetName] || fichierTelechargeTraite[sheetName];
            continue;
        }

        const uniqueHeadersNouveau = generateUniqueHeaders(infosNouveau.headers);
        const uniqueHeadersAncien = generateUniqueHeaders(infosAncien.headers);

        // Déterminer les colonnes de l'ancien fichier à conserver
        const setNomsEntetesNouveaux = new Set(infosNouveau.headers.map(h => h.name));
        const headersAnciensA_Conserver = uniqueHeadersAncien.filter(h => !setNomsEntetesNouveaux.has(h.name));

        // Ordre final: toutes les colonnes uniques du nouveau, puis les uniques de l'ancien qui n'y étaient pas
        const finalHeaderStructure = [...uniqueHeadersNouveau, ...headersAnciensA_Conserver];
        
        // Construction de la nouvelle feuille
        const resultatFeuille = { colonnes: [], donnees: [] };
        const headerRowFinal = {};

        finalHeaderStructure.forEach((headerInfo, idx) => {
            const finalColId = getExcelColumnName(idx);
            resultatFeuille.colonnes.push(finalColId);
            // On utilise le nom unique généré comme nouvel en-tête
            headerRowFinal[`${finalColId}1`] = headerInfo.uniqueName;
        });
        resultatFeuille.donnees.push(headerRowFinal);

        // Traitement des lignes de données
        const nombreLignesDataFinal = infosNouveau.dataRows.length; // Le nombre de lignes est dicté par le nouveau fichier

        for (let i = 0; i < nombreLignesDataFinal; i++) {
            const ligneDataCouranteResultat = {};
            const numLigneExcel = i + 2;

            finalHeaderStructure.forEach((headerInfo, idx) => {
                const finalColId = resultatFeuille.colonnes[idx];
                let valeurCellule = null;

                // Trouver la bonne valeur depuis sa source d'origine
                const sourceDataRow = uniqueHeadersNouveau.includes(headerInfo) 
                    ? infosNouveau.dataRows[i] 
                    : (headersAnciensA_Conserver.includes(headerInfo) ? infosAncien.dataRows[i] : null);

                if (sourceDataRow) {
                    const originalCellKey = `${headerInfo.colId}${numLigneExcel}`;
                    valeurCellule = sourceDataRow[originalCellKey];
                }

                ligneDataCouranteResultat[`${finalColId}${numLigneExcel}`] = (valeurCellule !== undefined) ? valeurCellule : null;
            });
            resultatFeuille.donnees.push(ligneDataCouranteResultat);
        }
        
        fichierResultatFusion[sheetName] = resultatFeuille;
        this.logger.log(`Fusion feuille '${sheetName}' terminée. ${nombreLignesDataFinal} lignes de données traitées.`);
    }

    // Gérer les feuilles qui n'existent que dans l'ancien fichier
    for (const sheetName in ancienFichierComplet) {
        if (!fichierResultatFusion.hasOwnProperty(sheetName)) {
            this.logger.log(`Conservation de l'ancienne feuille '${sheetName}' non présente dans le nouveau fichier.`);
            fichierResultatFusion[sheetName] = ancienFichierComplet[sheetName];
        }
    }

    sourceDonnee.fichier = fichierResultatFusion;
} else { 
    sourceDonnee.fichier = fichierTelechargeTraite; 
    this.logger.log(`Format non-fusionnable ou échec du parsing. Écrasement du fichier pour ${sourceDonnee.nomSource}.`);
}
        // ----- FIN DE LA LOGIQUE DE FUSION -----

        const formatEntite = await this.formatservice.getoneByLibelle(formatFichier);
        if (!formatEntite) {
          this.logger.error(`Entité Format introuvable pour: '${formatFichier}'.`);
          continue;
        }
        
        // ...
        sourceDonnee.format = formatEntite;
        sourceDonnee.libelleformat = formatEntite.libelleFormat;
        sourceDonnee.derniereMiseAJourReussieSource = new Date();
        
        // ÉTAPE 3: Sauvegarde
        await this.sourcededonneesrepo.save(sourceDonnee);
        this.logger.log(`SUCCÈS: Source ${sourceDonnee.nomSource} mise à jour.`);

      } catch (error) {
        this.logger.error(`ERREUR source ${sourceDonnee.nomSource} (ID: ${sourceDonnee.idsourceDonnes}): ${error.message}`, error.stack);
      } finally {
        // Nettoyage du fichier temporaire
        if (filePath && fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); }
          catch (e) { this.logger.warn(`Échec suppression temp ${filePath}: ${e.message}`); }
        }
      }
    }
    this.logger.log('Fin rafraîchissement des sources.');
}







  //cron de mise à jour des sources de données
  async refreshSourcesAuto(): Promise<void> {
    const sources = await this.sourcededonneesrepo.find({
      where: { source: Not(IsNull()) },
      relations: ['format'],
    });
  
    for (const source of sources) {
      if (!source.source || !source.source.startsWith('https')) continue;
  
      try {
        const response = await firstValueFrom(this.httpService.get(source.source, { responseType: 'arraybuffer' }));
        if (!response.data) continue;
  
        const formatFichier = detectFileFormat(source.source);
        const filePath = path.join(__dirname, `temp_auto.${formatFichier}`);
        fs.writeFileSync(filePath, response.data);
  
        let fichier = null;
        if (formatFichier === 'xlsx') {
          fichier = processExcelFile(filePath);
        } else if (formatFichier === 'csv') {
          fichier = await processCsvFile(filePath);
        } else if (formatFichier === 'json') {
          fichier = processJsonFile(filePath);
        } else {
          console.log(` Format non supporté pour la source ${source.source}`);
          continue;
        }
  
        fs.unlinkSync(filePath);
  
        const format = await this.formatservice.getoneByLibelle(formatFichier);
        if (!format) {
          console.log(`Format introuvable en base : ${formatFichier}`);
          continue;
        }
  
        // Mettre à jour uniquement les champs liés au fichier
        source.bd_normales = fichier;
        source.format = format;
        source.libelleformat = format.libelleFormat;
  
        await this.sourcededonneesrepo.save(source);
        console.log(` Mise à jour automatique : ${source.nomSource}`);
      } catch (error) {
        console.log(`Erreur sur ${source.source} : ${error.message}`);
      }
    }
  
    console.log('Rafraîchissement automatique terminé.');
  }
  
    async getAllsource(){
      try{
         return await this.sourcededonneesrepo.find()
      }
      catch(err){
        throw new HttpException(err.message,804)
        
      }
    }



    async getSourceById(idsourceDonnes: string): Promise<any> {
      const source = await this.sourcededonneesrepo.findOne({
        where: { idsourceDonnes },
      });
      if (!source) {
        throw new HttpException(
          `Source de données avec l'ID ${idsourceDonnes} non trouvée.`,
          803
        );
      }  
    
      return source
    }
    

// sources des données par enquete par projet
async getSourcesByEnquete(idenquete: string): Promise<SourceDonnee[]> {
  return this.sourcededonneesrepo.find({
    where: { enquete: { idenquete } },
    relations: ['enquete'], // Charge la relation si nécessaire
  });
}

async getSourcesByProjet(idprojet: string): Promise<SourceDonnee[]> {
  return this.sourcededonneesrepo.find({
    where: { enquete: { projet: { idprojet } } },
    relations: ['enquete', 'enquete.projet'], // Charge les relations imbriquées
  });
}


// nombre
async getBdsCountByProjet(idprojet: string): Promise<{ normales: number; jointes: number; total: number }> {
  // Récupérer toutes les sources du projet
  const sources = await this.sourcededonneesrepo.find({
    where: { enquete: { projet: { idprojet } } },
    relations: ['enquete', 'enquete.projet'], // Charge les relations nécessaires
  });

  // Compter les bases de données normales et jointes
  const normales = sources.filter((source) => source.bd_normales).length;
  const jointes = sources.filter((source) => source.bd_jointes).length;

  return {
    normales,
    jointes,
    total: normales + jointes,
  };
}



async getSourceWithFilteredData(idsourceDonnes: string): Promise<SourceDonnee> {
  const source = await this.getSourceById(idsourceDonnes);
  const fichier = source.fichier;

  if (!fichier || typeof fichier !== 'object') {
    throw new HttpException("Fichier invalide", 500);
  }

  const fichierFiltré: any = {};

  for (const feuilleName of Object.keys(fichier)) {
    const feuille = fichier[feuilleName];
    const donnees = feuille.donnees || [];
    const colonnesMasquees = feuille.meta?.colonnesMasquees || [];

    const donneesFiltrees = donnees.map(ligne => {
      const ligneFiltree: any = {};
      for (const cle in ligne) {
        const colLettre = cle.replace(/\d/g, '').toUpperCase();
        if (!colonnesMasquees.includes(colLettre)) {
          ligneFiltree[cle] = ligne[cle];
        }
      }
      return ligneFiltree;
    });

    fichierFiltré[feuilleName] = {
      ...feuille,
      donnees: donneesFiltrees, 
    };
  }

  return {
    ...source,
    fichier: fichierFiltré, //
  };
}

//pour la pagination
// async getBdsByProjetWithFilter(
//   idprojet: string,
//   bdType: 'normales' | 'jointes' | 'tous' | 'archive',
//   page: number = 1,
//   limit: number = 10 // Limite par page
// ): Promise<{ data: any[], total: number }> {
//   const queryBuilder = this.sourcededonneesrepo.createQueryBuilder('source')
//     .select(['source.nomSource', 'source.idsource'])
//     .innerJoin('source.enquete', 'enquete')
//     .innerJoin('enquete.projet', 'projet')
//     .where('projet.idprojet = :idprojet', { idprojet });

//   switch (bdType) {
//     case 'normales':
//       queryBuilder.andWhere('source.bd_normales = :value', { value: true });
//       break;
//     case 'jointes':
//       queryBuilder.andWhere('source.bd_jointes = :value', { value: true });
//       break;
//     case 'archive':
//       queryBuilder.andWhere('source.bd_archive = :value', { value: true });
//       break;
//     case 'tous':
//       break;
//     default:
//       throw new HttpException(
//         `Type "${bdType}" non supporté. Utilisez "normales", "jointes", "tous" ou "archive".`,
//         400
//       );
//   }

//   // Appliquer la pagination
//   const skip = (page - 1) * limit;
//   queryBuilder.skip(skip).take(limit);

//   // Récupérer les résultats et le total
//   const [sources, total] = await queryBuilder.getManyAndCount();

//   // Mapper les résultats
//   const data = sources.map((source) => ({
//     nomSource: source.nomSource,
//     idsource: source.idsourceDonnes,
//   }));

//   return { data, total };
// }


async getBdsByProjetWithFilter(
  idprojet: string,
  bdType: 'normales' | 'jointes' | 'tous' | 'archive'
): Promise<any[]> {
  // Créer un QueryBuilder pour la table sourcededonnees
  const queryBuilder = this.sourcededonneesrepo.createQueryBuilder('source')
    .select(['source.nomSource', 'source.idsourceDonnes']) // Sélectionner uniquement les champs nécessaires
    .innerJoin('source.enquete', 'enquete')
    .innerJoin('enquete.projet', 'projet')
    .where('projet.idprojet = :idprojet', { idprojet });

  switch (bdType) {
    case 'normales':
      queryBuilder.andWhere('source.bd_normales');
      break;
    case 'jointes':
      queryBuilder.andWhere('source.bd_jointes',);
      break;
    case 'archive':
      queryBuilder.andWhere('source.bd_archive = :value', { value: true });
      break;
    case 'tous':
      // Pas de filtre supplémentaire
      break;
    default:
      throw new HttpException(
        `Type "${bdType}" non supporté. Utilisez "normales", "jointes", "tous" ou "archive".`,
        400
      );
  }

  
  const sources = await queryBuilder.getMany();

  // Mapper les résultats
  return sources.map((source) => ({
    nomSource: source.nomSource,
    idsource: source.idsourceDonnes, 
  }));
}


//get bdByproject where InStudio est true

// async getBdsByProjetWithFilterInStudio(idprojet: string){

//   try{
//     const sources = await this.sourcededonneesrepo.find({
//     where: { enquete: { projet: { idprojet } },inStudio:true },
//     relations: ['enquete', 'enquete.projet'],
//   });
//   return sources

// }
// catch(err){
//   throw new HttpException(err.message,705)
// }
// }

async getBdsByProjetWithFilterInStudio(idprojet: string): Promise<SourceDonnee[]> {
  try {
    const query = this.sourcededonneesrepo
      .createQueryBuilder('source') // 'source' est un alias pour la table source_donnee
      .innerJoinAndSelect('source.enquete', 'enquete') // Joint et sélectionne les données de 'enquete'
      .innerJoin('enquete.projet', 'projet') 
      .where('source.inStudio = :inStudio', { inStudio: true })
      .andWhere('projet.idprojet = :idprojet', { idprojet: idprojet });
    return await query.getMany();

  } catch (err) {
    // Il est préférable de loguer l'erreur originale côté serveur
    this.logger.error(`Erreur lors de la récupération des sources pour le projet ${idprojet}: ${err.message}`, err.stack);
    throw new HttpException("Une erreur est survenue lors de la récupération des données.", 705);
  }
}






















async addColumn(
  idsource: string,
  body: addColumnDto
): Promise<SourceDonnee> {
  const { nomFeuille, nomColonne } = body;

  if (!nomColonne) {
    throw new HttpException(
      'Le nom de la nouvelle colonne est obligatoire.',
      701
    );
  }

  // Étape 1 : Récupérer la source de données
  const source = await this.getSourceById(idsource);
  const fichier = source.fichier;

  // Étape 2 : Récupérer la feuille ou la première feuille par défaut
  const sheet = getSheetOrDefault(fichier, nomFeuille);

  // Vérifier si la feuille est valide
  if (!sheet?.donnees || sheet.donnees.length === 0) {
    throw new HttpException(
      `La feuille spécifiée est vide ou mal initialisée.`,
      806
    );
  }

  // Étape 3 : Vérifier les entêtes existantes et générer un nom unique
  const headers = sheet.donnees[0]; // Première ligne contient les entêtes
  const existingHeaders = Object.values(headers).map((header) =>
    header?.toString().toLowerCase()
  ); // Convertir tous les noms existants en minuscule

  let uniqueName = nomColonne;
  let suffix = 1;

  while (existingHeaders.includes(uniqueName.toLowerCase())) {
    uniqueName = `${nomColonne}${suffix}`;
    suffix++;
  }

  // Étape 4 : Ajouter une nouvelle colonne
  const newColumnLetter = generateNextColumnLetter(sheet.colonnes);
  headers[`${newColumnLetter}1`] = uniqueName; // Ajouter l'entête avec un nom unique
  sheet.colonnes.push(newColumnLetter);

  // Initialiser toutes les cellules de la nouvelle colonne à `null`
  sheet.donnees.forEach((row, index) => {
    if (index > 0) { // Ne pas toucher à la première ligne (headers)
      row[`${newColumnLetter}${index + 1}`] = null;
    }
  });

  // Étape 5 : Sauvegarder les modifications
  if (Array.isArray(fichier)) {
    const sheetIndex = fichier.findIndex(
      (sheetObj) => sheetObj[nomFeuille || Object.keys(sheetObj)[0]]
    );
    if (sheetIndex >= 0) {
      fichier[sheetIndex][nomFeuille || Object.keys(fichier[sheetIndex])[0]] =
        sheet;
    }
  } else {
    fichier[nomFeuille || Object.keys(fichier)[0]] = sheet;
  }

  source.fichier = fichier;

  return await this.sourcededonneesrepo.save(source);
}





//----------------- modification de colonne

async modifyColumn(
  idsourceDonnes: string,
  body: modifyColumnDto // Transformation des valeurs (facultatif)
): Promise<SourceDonnee> {
  const { nomFeuille, nomColonne, newnomColonne, transform } = body;

  const source = await this.getSourceById(idsourceDonnes);
  const fichier = source.fichier;

  if (!fichier || typeof fichier !== "object") {
    throw new HttpException("Les données de fichier sont invalides.", 500);
  }


  const targetSheetName = nomFeuille && nomFeuille.trim() ? nomFeuille : Object.keys(fichier)[0]; 
  const sheet = fichier[targetSheetName];

  if (!sheet) {
    throw new HttpException(`La feuille "${targetSheetName}" n'existe pas.`, 803);
  }

  if (!sheet.donnees || sheet.donnees.length === 0) {
    throw new HttpException(`La feuille est vide ou mal initialisée.`, 806);
  }

  const headers = sheet.donnees[0]; // Première ligne contient les entêtes
  const columnLetter = Object.keys(headers).find(
    (key) => headers[key] === nomColonne
  );

  if (!columnLetter) {
    throw new HttpException(`L'entête "${nomColonne}" n'existe pas.`, 404);
  }

  if (newnomColonne) {
    headers[columnLetter] = newnomColonne;
  }

  if (transform) {
    sheet.donnees.slice(1).forEach((row, index) => {
      const cellKey = `${columnLetter}${index + 2}`;
      if (row[cellKey] !== undefined) {
        row[cellKey] = transform(row[cellKey]); // Appliquer la transformation
      }
    });
  }

  fichier[targetSheetName] = sheet;

  source.fichier = fichier;
  return await this.sourcededonneesrepo.save(source);
}




async modifyCell(
  idsourceDonnes: string,
  body: modifyCellDto
): Promise<SourceDonnee> {
  const { nomFeuille, cellule, nouvelleValeur } = body;

// Récupérer la source de données
  const source = await this.getSourceById(idsourceDonnes);
  const fichier = source.fichier;

  if (!fichier || typeof fichier !== "object") {
    throw new HttpException("Les données de fichier sont invalides.", 500);
  }

// Récupérer la feuille directement
  const targetSheetName = nomFeuille && nomFeuille.trim() ? nomFeuille : Object.keys(fichier)[0];
  const sheet = fichier[targetSheetName];

  if (!sheet) {
    throw new HttpException(`La feuille "${targetSheetName}" n'existe pas.`, 803);
  }

  if (!sheet.donnees || sheet.donnees.length === 0) {
    throw new HttpException(`La feuille est vide ou mal initialisée.`, 806);
  }


  const rowIndex = parseInt(cellule.replace(/\D/g, ""), 10); // Extraire le numéro de ligne (ex: A2 → 2)
  const colKey = cellule.replace(/\d/g, ""); // Extraire la lettre de colonne (ex: A2 → A)

  if (!rowIndex || !colKey) {
    throw new HttpException(`Format de cellule invalide "${cellule}".`, 400);
  }

  if (!sheet.donnees[rowIndex - 1]) {
    throw new HttpException(`La ligne ${rowIndex} n'existe pas.`, 404);
  }


  sheet.donnees[rowIndex - 1][cellule] = nouvelleValeur;

  fichier[targetSheetName] = sheet;
  source.fichier = fichier;

  return await this.sourcededonneesrepo.save(source);
}



// Instudio à true ou false (pour indiquer)

      //ajouter et enlever du studio

      async InOutstudio(idsource:string){
        try{
          const source = await this.getSourceById(idsource)
          if(!source){
            throw new HttpException("source non trouvée",705)
          }
        source.inStudio=!source.inStudio
        await this.sourcededonneesrepo.save(source)
        }
        catch(err){
          throw new HttpException(err.message,705)
        }
      }




      //togglemasquer

      async toggleColumnsVisibility(
        idsourceDonnes: string,
        body: MasqueColumnToggleDto
      ): Promise<SourceDonnee> {
        const { nomFeuille, colonnes, masquer } = body;
      
        const source = await this.getSourceById(idsourceDonnes);
        const fichier = source.fichier;
      
        if (!fichier || typeof fichier !== 'object') {
          throw new HttpException("Les données du fichier sont invalides.", 705);
        }
      
        const targetSheetName = nomFeuille?.trim() || Object.keys(fichier)[0];
        const sheet = fichier[targetSheetName];
      
        if (!sheet) {
          throw new HttpException(`La feuille "${targetSheetName}" n'existe pas.`, 706);
        }
      
      
        if (!sheet.meta) {
          sheet.meta = {};
        }
      
        if (!Array.isArray(sheet.meta.colonnesMasquees)) {
          sheet.meta.colonnesMasquees = [];
        }
      
        const colonnesMasquees = new Set(sheet.meta.colonnesMasquees.map(c => c.toUpperCase()));
      
        for (const col of colonnes.map(c => c.toUpperCase())) {
          if (masquer) {
            colonnesMasquees.add(col);
          } else {
            colonnesMasquees.delete(col);
          }
        }
      
        sheet.meta.colonnesMasquees = Array.from(colonnesMasquees);
      
        //  Sauvegarde finale
        fichier[targetSheetName] = sheet;
        source.fichier = fichier;
      
        return await this.sourcededonneesrepo.save(source);
      }


async removeColumns(idsource: string, body: removeColumnDto,user:any): Promise<SourceDonnee> {
    const { nomFeuille, nomColonnes } = body;

     if (user.role === UserRole.Client) {
    throw new HttpException("Seul le superAdmin peut supprimer des colonnes", 701);
  }
    // Vérifier que la liste des colonnes n'est pas vide
    if (!nomColonnes || nomColonnes.length === 0) {
      throw new HttpException('Aucune colonne spécifiée pour la suppression.', 702);
    }

    // Étape 1 : Récupérer la source de données
    const source = await this.getSourceById(idsource);
    const fichier = source.fichier;

    // Étape 2 : Récupérer la feuille ou la première feuille par défaut
    const sheet = getSheetOrDefault(fichier, nomFeuille);

    // Vérifier si la feuille est valide
    if (!sheet?.donnees || sheet.donnees.length === 0) {
      throw new HttpException(
        `La feuille spécifiée est vide ou mal initialisée.`,
        806
      );
    }

    // Étape 3 : Identifier les colonnes à supprimer et vérifier leur existence
    const notFoundColumns: string[] = [];
    const headers = sheet.donnees[0]; // Première ligne contient les entêtes
    const columnLetters: string[] = [];

    for (const nomColonne of nomColonnes) {
      const columnLetter = nomColonne.replace(/\d/g, ''); // Extraire la lettre de colonne
      if (!sheet.colonnes.includes(columnLetter)) {
        notFoundColumns.push(nomColonne);
        continue;
      }
      columnLetters.push(columnLetter);
    }

    if (notFoundColumns.length > 0) {
      throw new HttpException(
        `Les colonnes suivantes sont introuvables : ${notFoundColumns.join(', ')}`,
        803
      );
    }

    // Étape 4 : Supprimer les entêtes et les données associées pour chaque colonne
    for (const columnLetter of columnLetters) {
      const headerKey = Object.keys(headers).find((key) =>
        key.startsWith(columnLetter)
      );
      if (headerKey) {
        delete headers[headerKey]; // Supprimer l'entête
        sheet.donnees.slice(1).forEach((row, index) => {
          delete row[`${columnLetter}${index + 2}`]; // Supprimer les données ligne par ligne
        });
      }
    }

    // Mettre à jour la liste des colonnes
    sheet.colonnes = sheet.colonnes.filter((col) => !columnLetters.includes(col));

    // Étape 5 : Sauvegarder les modifications
    if (Array.isArray(fichier)) {
      const sheetIndex = fichier.findIndex(
        (sheetObj) => sheetObj[nomFeuille || Object.keys(sheetObj)[0]]
      );
      if (sheetIndex >= 0) {
        fichier[sheetIndex][nomFeuille || Object.keys(fichier[sheetIndex])[0]] = sheet;
      }
    } else {
      fichier[nomFeuille || Object.keys(fichier)[0]] = sheet;
    }

    source.fichier = fichier;

    return await this.sourcededonneesrepo.save(source);
  }




// async applyFunctionAndSave(idsourceDonnes: string,applyFunctionDto: ApplyFunctionDto): Promise<SourceDonnee> {
//   const { nomFeuille, columnReferences, operation, separator, targetColumn } = applyFunctionDto;

//   // Étape 1 : Récupérer la source de données
//   const source = await this.getSourceById(idsourceDonnes);
//   let fichier = source.fichier;

//   // Étape 2 : Récupérer la feuille
//   const targetSheetName = nomFeuille && nomFeuille.trim() ? nomFeuille : Object.keys(fichier)[0];
//   const sheet = fichier[targetSheetName];

//   if (!sheet || !sheet.donnees || sheet.donnees.length <= 1) {
//     throw new HttpException(
//       `La feuille spécifiée est vide ou ne contient pas de données.`,
//       806
//     );
//   }

//   // Étape 3 : Valider les colonnes sélectionnées
//   const headers = sheet.donnees[0];
//   const columnLetters = columnReferences.map((reference) => {
//     const columnLetter = reference.replace(/\d/g, '');
//     if (!sheet.colonnes.includes(columnLetter)) {
//       throw new HttpException(
//         `La colonne référencée "${reference}" n'existe pas.`,
//         803
//       );
//     }
//     return columnLetter;
//   });

//   // Étape 4 : Extraire les valeurs des colonnes cibles
//   const columnValues = columnLetters.map((letter) =>
//     sheet.donnees.slice(1).map((row, index) => {
//       const cellKey = `${letter}${index + 2}`;
//       const value = row[cellKey];
//       return value !== undefined && value !== null ? parseFloat(value) : null;
//     })
//   );

//   // Étape 5 : Appliquer la fonction
//   let columnResult: any[] = [];
//   try {
//     switch (operation.toLowerCase()) {
//       case 'sum': {
//         columnResult = columnValues[0].map((_, index) =>
//           columnValues.reduce((acc, col) => acc + (col[index] || 0), 0)
//         );
//         break;
//       }
//       case 'average': {
//         columnResult = columnValues[0].map((_, index) => {
//           const validValues = columnValues.map((col) => col[index] || 0);
//           const sum = validValues.reduce((acc, val) => acc + val, 0);
//           return sum / validValues.length;
//         });
//         break;
//       }
//       case 'max': {
//         columnResult = columnValues[0].map((_, index) =>
//           Math.max(...columnValues.map((col) => col[index] || 0))
//         );
//         break;
//       }
//       case 'min': {
//         columnResult = columnValues[0].map((_, index) =>
//           Math.min(...columnValues.map((col) => col[index] || 0))
//         );
//         break;
//       }
//       case 'count': {
//         columnResult = columnValues[0].map((_, index) =>
//           columnValues.map((col) => col[index]).filter((val) => val !== null && val !== undefined).length
//         );
//         break;
//       }
//       case 'concat': {
//         columnResult = columnValues[0].map((_, index) =>
//           columnLetters
//             .map((_, colIndex) => columnValues[colIndex][index]?.toString() || '')
//             .join(separator || ' ')
//         );
//         break;
//       }
//       case 'multiply': {
//         columnResult = columnValues[0].map((_, index) =>
//           columnValues.reduce((acc, col) => acc * (col[index] || 1), 1)
//         );
//         break;
//       }
//       case 'divide': {
//         columnResult = columnValues[0].map((_, index) => {
//           const validValues = columnValues.map((col) => col[index]).filter((val) => val !== null && val !== 0);
//           return validValues.reduce((acc, val) => acc / val, validValues[0] || 1);
//         });
//         break;
//       }
//       case 'subtract': {
//         columnResult = columnValues[0].map((_, index) =>
//           columnValues.reduce((acc, col) => acc - (col[index] || 0))
//         );
//         break;
//       }
//       case 'modulo': {
//         columnResult = columnValues[0].map((_, index) => {
//           const validValues = columnValues.map((col) => col[index]).filter((val) => val !== null && val !== 0);
//           return validValues.reduce((acc, val) => acc % val, validValues[0] || 1);
//         });
//         break;
//       }
//       default:
//         throw new HttpException(`L'opération "${operation}" n'est pas supportée.`, 802);
//     }
//   } catch (err) {
//     throw new HttpException(
//       `L'opération "${operation}" n'est pas possible pour les colonnes sélectionnées.`,
//       803
//     );
//   }

// // Vérifier si la colonne cible existe
//   const targetColumnLetter = targetColumn.replace(/\d/g, '');
//   if (!sheet.colonnes.includes(targetColumnLetter)) {
//     throw new HttpException(
//       `La colonne cible "${targetColumnLetter}" n'existe pas.`,
//       804
//     );
//   }

//   // Étape 6 : Ajouter les résultats dans la colonne cible
//   sheet.donnees.slice(1).forEach((row, index) => {
//     const cellKey = `${targetColumnLetter}${index + 2}`;
//     row[cellKey] = columnResult[index];
//   });

//   fichier[targetSheetName] = sheet;
//   source.fichier = { ...fichier };

//   return await this.sourcededonneesrepo.save(source);
// }


async applyFunctionAndSave2(
  idsourceDonnes: string,
  applyFunctionDto: ApplyfunctionDto2
): Promise<SourceDonnee> {
  const { nomFeuille, formula, targetColumn } = applyFunctionDto;

  // Étape 1 : Récupérer la source de données
  const source = await this.getSourceById(idsourceDonnes);
  let fichier = source.fichier;

  // Étape 2 : Récupérer la feuille
  const targetSheetName = nomFeuille && nomFeuille.trim() ? nomFeuille : Object.keys(fichier)[0];
  const sheet = fichier[targetSheetName];

  if (!sheet || !sheet.donnees || sheet.donnees.length <= 1) {
    throw new HttpException(`La feuille spécifiée est vide ou ne contient pas de données.`, 806);
  }

  // Étape 3 : Extraire les références de cellules (A1, B2, C3, etc.)
  const regex = /[A-Z]+\d+/g;
  const references = formula.match(regex);

  if (!references || references.length === 0) {
    throw new HttpException(`Aucune référence de colonne valide trouvée dans la formule.`, 807);
  }

  // Étape 4 : Récupérer les valeurs de chaque cellule référencée
  let columnValues: Record<string, any[]> = {};
  references.forEach((ref) => {
    const columnLetter = ref.replace(/\d/g, '');
    if (!sheet.colonnes.includes(columnLetter)) {
      throw new HttpException(`La colonne "${columnLetter}" n'existe pas.`, 803);
    }
    columnValues[ref] = sheet.donnees.slice(1).map((row, index) => {
      const cellKey = `${columnLetter}${index + 2}`;
      return row[cellKey] !== undefined ? row[cellKey] : null;
    });
  });


  function safeCompare(a: any, b: any): boolean {
    if (!isNaN(a) && !isNaN(b)) {
      return Number(a) === Number(b); // Comparaison numérique
    }
    return String(a).localeCompare(String(b)) === 0; // Comparaison de texte
  }

  
  function convertExcelFunctions(formula: string): string {
    const convertedFormula = formula
      // SOMME(X;Y;Z) -> (X + Y + Z)
      .replace(/SOMME\((.*?)\)/g, (_, values) => `(${values.replace(/;/g, ' + ')})`)
  
      // MOYENNE(X;Y;Z) -> (X + Y + Z) / nombre de valeurs
      .replace(/MOYENNE\((.*?)\)/g, (_, values) => {
        const count = values.split(";").length;
        return `(${values.replace(/;/g, ' + ')}) / ${count}`;
      })
  
      // MIN(X;Y;Z) -> Math.min(X, Y, Z)
      .replace(/MIN\((.*?)\)/g, (_, values) => `Math.min(${values.replace(/;/g, ', ')})`)
  
      // MAX(X;Y;Z) -> Math.max(X, Y, Z)
      .replace(/MAX\((.*?)\)/g, (_, values) => `Math.max(${values.replace(/;/g, ', ')})`)
  
      // ABS(X) -> Math.abs(X)
      .replace(/ABS\((.*?)\)/g, (_, value) => `Math.abs(${value})`)
  
      // CONCATENER(X;Y;Z) -> (X + Y + Z)
      .replace(/CONCATENER\((.*?)\)/g, (_, values) => {
        return values
          .split(";")
          .map(value => {
            const trimmedValue = value.trim();
            return isNaN(trimmedValue) ? `"${trimmedValue}"` : trimmedValue; // Wrap only non-numeric values in quotes
          })
          .join(' + ');
      })
       
      
      
      
      
  
      // NB(X;Y;Z) -> Nombre d'éléments non vides
      .replace(/NB\((.*?)\)/g, (_, values) => `(${values.split(";").map(v => `(${v} !== undefined && ${v} !== null ? 1 : 0)`).join(" + ")})`)
  
      // ET(A;B;C) -> (A && B && C)
      .replace(/ET\((.*?)\)/g, (_, values) => `(${values.replace(/;/g, ' && ')})`)
  
      // OU(A;B;C) -> (A || B || C)
      .replace(/OU\((.*?)\)/g, (_, values) => `(${values.replace(/;/g, ' || ')})`)
  
      // SI(condition;valeur_si_vrai;valeur_si_faux)
      // NOUVELLE VERSION CORRIGÉE
.replace(/SI\((.*?);(.*?);(.*?)\)/g, (_, condition, trueVal, falseVal) => {
    const operatorMatch = condition.match(/(>=|<=|>|<|=)/);
    if (!operatorMatch) {
      throw new Error(`Opérateur de comparaison manquant ou condition non gérée dans: ${condition}`);
    }

    const operator = operatorMatch[0];
    // CORRECTION 1: Convertir le "=" d'Excel en "==" de JavaScript
    const jsOperator = operator === '=' ? '==' : operator;

    const parts = condition.split(operator);
    const left = parts[0].trim();
    const right = parts[1].trim();

    // CORRECTION 2: Une fonction helper pour formater correctement les valeurs
    // Si c'est un nombre, on le laisse tel quel. Sinon, on le met entre guillemets.
    const formatAsJsValue = (val) => {
      // isFinite gère les nombres, mais aussi les chaînes qui ne sont que des nombres
      if (val !== '' && isFinite(Number(val))) {
        return val; // C'est un nombre, on ne met pas de guillemets
      }
      // C'est une chaîne de caractères (ou vide), on met des guillemets
      return `"${val}"`; 
    };

    const formattedLeft = formatAsJsValue(left);
    const formattedRight = formatAsJsValue(right);
    const formattedTrue = formatAsJsValue(trueVal.trim());
    const formattedFalse = formatAsJsValue(falseVal.trim());

    return `( ${formattedLeft} ${jsOperator} ${formattedRight} ? ${formattedTrue} : ${formattedFalse} )`;
});
  
    console.log(" Formule Avant :", formula);
    console.log(" Formule Après :", convertedFormula);
  
    return convertedFormula;
  }
  
  // Étape 5 : Appliquer la formule ligne par ligne
  const columnResult: any[] = [];
  sheet.donnees.slice(1).forEach((row, index) => {
    try {
      let evaluatedFormula = formula;

      // Remplacement des valeurs dans la formule
      references.forEach((ref) => {
        evaluatedFormula = evaluatedFormula.replace(ref, columnValues[ref][index] || 0);
      });

      // Conversion des fonctions Excel en JS
      evaluatedFormula = convertExcelFunctions(evaluatedFormula);

      // 🔍 Logs pour vérifier les formules
      console.log(`🔄 Ligne ${index + 2} - Formule Finale :`, evaluatedFormula);

      //  Évaluation avec `safeCompare` ajouté dans le contexte
      // columnResult.push(evaluate(evaluatedFormula, { safeCompare }));
      const safeEval = new Function(`return ${evaluatedFormula};`);
      columnResult.push(safeEval());
    } catch (error) {
      console.error(`❌ Erreur d'évaluation à la ligne ${index + 2}:`, error.message);
      throw new HttpException(`Erreur lors de l'évaluation de la formule à la ligne ${index + 2}`, 808);
    }
  });

  // Vérifier si la colonne cible existe
  const targetColumnLetter = targetColumn.replace(/\d/g, '');
  if (!sheet.colonnes.includes(targetColumnLetter)) {
    throw new HttpException(`La colonne cible "${targetColumnLetter}" n'existe pas.`, 804);
  }

  // Étape 6 : Ajouter les résultats dans la colonne cible
  sheet.donnees.slice(1).forEach((row, index) => {
    const cellKey = `${targetColumnLetter}${index + 2}`;
    row[cellKey] = columnResult[index];
  });

  fichier[targetSheetName] = sheet;
  source.fichier = { ...fichier };

  return await this.sourcededonneesrepo.save(source);
}


@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT,{ name: 'syncSources' })
async autoSync() {
  await this.refreshSourcesAuto();
}





async findById(id: string): Promise<SourceDonnee> {
  const source = await this.sourcededonneesrepo.findOne({
      where: { idsourceDonnes: id },
      relations: ['enquete', 'enquete.projet', 'enquete.projet.structure'], // Charger les relations nécessaires pour la vérification
  });
  if (!source) {
      throw new NotFoundException(`Source de données avec l'ID ${id} non trouvée.`);
  }
  return source;
}



// ...
async findoneById(id: string): Promise<SourceDonnee> { // Assurez-vous que cette méthode charge bien les relations
  const source = await this.sourcededonneesrepo.findOne({
      where: { idsourceDonnes: id },
      relations: [
          'enquete',
          'enquete.projet',
          'enquete.projet.structure' // Essentiel pour la vérification des droits client
      ],
  });
  if (!source) {
      throw new NotFoundException(`Source de données avec l'ID ${id} non trouvée.`);
  }

   if (source.enquete && source.enquete.projet && !source.enquete.projet.structure) {
 
        console.warn(`Structure non chargée pour le projet de l'enquête de la source ${id}`);
    }

  return source;
}









// async getOneConfigurationSource(
//     projetId: string,
//     sourceId: string,
//     bdType: 'normales' | 'jointes' | 'tous',
//     loggedInUser: MembreStruct,
//   ): Promise<any> {
//     console.log(`[getOneConfigurationSource] START - ProjetID: ${projetId}, SourceID: ${sourceId}, BdType: ${bdType}`);

//     const projetExists = await this.projetRepo.findOneBy({ idprojet: projetId });
//     if (!projetExists) {
//       throw new NotFoundException(`Projet with ID ${projetId} not found.`);
//     }

//     const query = this.sourcededonneesrepo
//       .createQueryBuilder('source')
//       .innerJoin('source.enquete', 'enqueteFilter')
//       .innerJoin('enqueteFilter.projet', 'projetFilter', 'projetFilter.idprojet = :projetId', { projetId })
//       .leftJoinAndSelect('source.enquete', 'enqueteDetails')
//       .leftJoinAndSelect('enqueteDetails.projet', 'projetDetails')
//       .leftJoinAndSelect('projetDetails.structure', 'structure')
//       .leftJoinAndSelect('structure.membres', 'structureMembres')
//       .where('source.idsourceDonnes = :sourceId', { sourceId });

//     if (bdType === 'normales') {
//       query.andWhere('source.bd_normales IS NOT NULL');
//     } else if (bdType === 'jointes') {
//       query.andWhere('source.bd_jointes IS NOT NULL');
//     } else if (bdType !== 'tous') {
//       throw new BadRequestException(`Type de BD "${bdType}" non supporté. Utilisez "normales", "jointes", ou "tous".`);
//     }

//     const source = await query.getOne();
//     if (!source) {
//       throw new NotFoundException(`Aucune source trouvée avec l'ID ${sourceId} pour le projet ${projetId}`);
//     }

//     // Traitement des autorisations
//     const allUserIdsFromAutorisations = new Set<string>();
//     if (source.autorisations) {
//       (Object.keys(source.autorisations) as Array<keyof AutorisationsSourceDonnee>).forEach(key => {
//         const ids = source.autorisations![key];
//         if (Array.isArray(ids)) {
//           ids.forEach(uid => allUserIdsFromAutorisations.add(uid));
//         }
//       });
//     }

//     let usersFromAutorisationsMap: Map<string, UserEntity> = new Map();
//     let modified = false;
//     if (allUserIdsFromAutorisations.size > 0) {
//       try {
//         const userDetailsArray = await this.userservice.findby(Array.from(allUserIdsFromAutorisations));
//         userDetailsArray.forEach(user => {
//           if (user && user.iduser) {
//             usersFromAutorisationsMap.set(user.iduser, user);
//           }
//         });
//       } catch (error) {
//         console.warn(`[getOneConfigurationSource] Certains utilisateurs non trouvés : ${error.message}`);
//         // Extraire les IDs introuvables de l'erreur
//         const errorMessage = error.message || '';
//         const missingIdsMatch = errorMessage.match(/Users not found: ([\w-, ]+)/);
//         if (missingIdsMatch) {
//           const missingIds = missingIdsMatch[1].split(', ');
//           // Supprimer les IDs introuvables des autorisations
//           if (source.autorisations) {
//             (Object.keys(source.autorisations) as Array<keyof AutorisationsSourceDonnee>).forEach(key => {
//               if (Array.isArray(source.autorisations![key])) {
//                 const initialLength = source.autorisations![key].length;
//                 source.autorisations![key] = source.autorisations![key].filter(id => !missingIds.includes(id));
//                 if (source.autorisations![key].length !== initialLength) {
//                   modified = true;
//                 }
//               }
//             });
//             // Sauvegarder la source si des modifications ont été faites
//             if (modified) {
//               console.log(`[getOneConfigurationSource] Mise à jour des autorisations pour la source ${source.idsourceDonnes}`);
//               await this.sourcededonneesrepo.save(source);
//             }
//           }
//         }
//         // Continuer le traitement même en cas d'erreur
//       }
//     }

//     const structureEntity = source.enquete?.projet?.structure;
//     const membresDeStructure: MembreStruct[] = structureEntity?.membres ?? [];

//     const usersDeStructure = membresDeStructure.map((m) => ({
//       user: m.iduser,
//       username: `${m.name || ''} ${m.firstname || ''}`.trim(),
//       role: m.roleMembre,
//     }));

//     const formatAutorisationsPourOptionB = (type: keyof AutorisationsSourceDonnee) => {
//       const idsFromSourceAuth = source.autorisations?.[type] ?? [];
//       return idsFromSourceAuth
//         .map(userId => {
//           const userDetail = usersFromAutorisationsMap.get(userId);
//           if (userDetail) {
//             const structureMemberInfo = usersDeStructure.find(sm => sm.user === userDetail.iduser);
//             const roleToDisplay = structureMemberInfo
//               ? structureMemberInfo.role
//               : (userDetail as any).roleMembre || (userDetail as any).role || null;

//             return {
//               user: userDetail.iduser,
//               username: `${userDetail.name || ''} ${userDetail.firstname || ''}`.trim(),
//               role: roleToDisplay,
//             };
//           }
//           return null;
//         })
//         .filter(user => user !== null);
//     };

//     const result = {
//       id: source.idsourceDonnes,
//       nombd: source.nomSource,
//       users: usersDeStructure,
//       autorisation: {
//         modifier: formatAutorisationsPourOptionB('modifier'),
//         visualiser: formatAutorisationsPourOptionB('visualiser'),
//         telecharger: formatAutorisationsPourOptionB('telecharger'),
//       },
//     };

//     return result;
//   }


// async getOneConfigurationSource(
//     projetId: string,
//     sourceId: string,
//     bdType: 'normales' | 'jointes' | 'tous',
//     loggedInUser: MembreStruct,
//   ): Promise<any> {
//     console.log(`[getOneConfigurationSource] START - ProjetID: ${projetId}, SourceID: ${sourceId}, BdType: ${bdType}`);

//     // 1. Verify project existence
//     const projetExists = await this.projetRepo.findOneBy({ idprojet: projetId });
//     if (!projetExists) {
//       throw new NotFoundException(`Projet with ID ${projetId} not found.`);
//     }

//     // 2. Fetch SuperAdmin
//     const superAdmin = await this.userrepo.findOne({ where: { role: UserRole.SuperAdmin } });
//     if (!superAdmin) {
//       console.warn('[getOneConfigurationSource] No SuperAdmin found in the database.');
//     }

//     // 3. Build the query for the source
//     const query = this.sourcededonneesrepo
//       .createQueryBuilder('source')
//       .innerJoin('source.enquete', 'enqueteFilter')
//       .innerJoin('enqueteFilter.projet', 'projetFilter', 'projetFilter.idprojet = :projetId', { projetId })
//       .leftJoinAndSelect('source.enquete', 'enqueteDetails')
//       .leftJoinAndSelect('enqueteDetails.projet', 'projetDetails')
//       .leftJoinAndSelect('projetDetails.structure', 'structure')
//       .leftJoinAndSelect('structure.membres', 'structureMembres')
//       .where('source.idsourceDonnes = :sourceId', { sourceId });

//     if (bdType === 'normales') {
//       query.andWhere('source.bd_normales IS NOT NULL');
//     } else if (bdType === 'jointes') {
//       query.andWhere('source.bd_jointes IS NOT NULL');
//     } else if (bdType !== 'tous') {
//       throw new BadRequestException(`Type de BD "${bdType}" non supporté. Utilisez "normales", "jointes", ou "tous".`);
//     }

//     const source = await query.getOne();
//     if (!source) {
//       throw new NotFoundException(`Aucune source trouvée avec l'ID ${sourceId} pour le projet ${projetId}`);
//     }

//     // 4. Collect user IDs from autorisations
//     const allUserIdsFromAutorisations = new Set<string>();
//     if (source.autorisations) {
//       (Object.keys(source.autorisations) as Array<keyof AutorisationsSourceDonnee>).forEach(key => {
//         const ids = source.autorisations![key];
//         if (Array.isArray(ids)) {
//           ids.forEach(uid => allUserIdsFromAutorisations.add(uid));
//         }
//       });
//     }

//     // 5. Fetch user details and handle missing IDs
//     let usersFromAutorisationsMap: Map<string, UserEntity> = new Map();
//     if (allUserIdsFromAutorisations.size > 0) {
//       try {
//         const userDetailsArray = await this.userservice.findby(Array.from(allUserIdsFromAutorisations));
//         userDetailsArray.forEach(user => {
//           if (user && user.iduser) {
//             usersFromAutorisationsMap.set(user.iduser, user);
//           }
//         });
//       } catch (error) {
//         console.warn(`[getOneConfigurationSource] Certains utilisateurs non trouvés : ${error.message}`);
//         // Continue without throwing to avoid breaking the response
//       }
//     }

//     // 6. Build users array, including SuperAdmin
//     const structureEntity = source.enquete?.projet?.structure;
//     const membresDeStructure: MembreStruct[] = structureEntity?.membres ?? [];

//     const usersDeStructure = membresDeStructure.map((m) => ({
//       user: m.iduser,
//       username: `${m.name || ''} ${m.firstname || ''}`.trim(),
//       role: m.roleMembre,
//     }));

//     // Add SuperAdmin to users if not already included
//     if (superAdmin && !usersDeStructure.some(u => u.user === superAdmin.iduser)) {
//       usersDeStructure.push({
//         user: superAdmin.iduser,
//         username: `${superAdmin.name || ''} ${superAdmin.firstname || ''}`.trim(),
//         role: UserRole.SuperAdmin,
//       });
//     }

//     const formatAutorisationsPourOptionB = (type: keyof AutorisationsSourceDonnee) => {
//       const idsFromSourceAuth = source.autorisations?.[type] ?? [];
//       return idsFromSourceAuth
//         .map(userId => {
//           const userDetail = usersFromAutorisationsMap.get(userId) || (userId === superAdmin?.iduser ? superAdmin : null);
//           if (userDetail) {
//             const structureMemberInfo = usersDeStructure.find(sm => sm.user === userDetail.iduser);
//             const roleToDisplay = structureMemberInfo
//               ? structureMemberInfo.role
//               : (userDetail as any).roleMembre || (userDetail as any).role || null;

//             return {
//               user: userDetail.iduser,
//               username: `${userDetail.name || ''} ${userDetail.firstname || ''}`.trim(),
//               role: roleToDisplay,
//             };
//           }
//           return null;
//         })
//         .filter(user => user !== null);
//     };

//     const result = {
//       id: source.idsourceDonnes,
//       nombd: source.nomSource,
//       users: usersDeStructure,
//       autorisation: {
//         modifier: formatAutorisationsPourOptionB('modifier'),
//         visualiser: formatAutorisationsPourOptionB('visualiser'),
//         telecharger: formatAutorisationsPourOptionB('telecharger'),
//       },
//     };

//     console.log(`[getOneConfigurationSource] END - Returning processed source for ProjetID: ${projetId}, SourceID: ${sourceId}`);
//     return result;
//   }


//   async getConfigurationSources(
//     projetId: string,
//     bdType: 'normales' | 'jointes' | 'tous',
//     loggedInUser: MembreStruct, // Still present, potentially for future authorization logic
//   ): Promise<any[]> {
//     console.log(`[getConfigurationSources] START - ProjetID: ${projetId}, BdType: ${bdType}`);

//     // Verify project existence
//     const projetExists = await this.projetRepo.findOneBy({ idprojet: projetId }); // Adjust 'idprojet' if PK name is different
//     if (!projetExists) {
//       throw new NotFoundException(`Projet with ID ${projetId} not found.`);
//     }

//     // 1. Build the initial query for sources
//     const query = this.sourcededonneesrepo
//       .createQueryBuilder('source')
//       // Join to filter by project ID. 'projetRel' is used for the join condition.
//       .innerJoin('source.enquete', 'enqueteFilter') 
//       .innerJoin('enqueteFilter.projet', 'projetFilter', 'projetFilter.idprojet = :projetId', { projetId })
//       .leftJoinAndSelect('source.enquete', 'enqueteDetails')
//       .leftJoinAndSelect('enqueteDetails.projet', 'projetDetails') // This will be the same project as projetFilter
//       .leftJoinAndSelect('projetDetails.structure', 'structure')
//       .leftJoinAndSelect('structure.membres', 'structureMembres');

//     // Add conditions for bdType
//     if (bdType === 'normales') {
//       query.andWhere('source.bd_normales IS NOT NULL');
//     } else if (bdType === 'jointes') {
//       query.andWhere('source.bd_jointes IS NOT NULL');
//     } else if (bdType !== 'tous') {
     
//       throw new BadRequestException(`Type de BD "${bdType}" non supporté. Utilisez "normales", "jointes", ou "tous".`);
//     }

//     const sources = await query.getMany();

//     if (sources.length === 0) {
//       console.log(`[getConfigurationSources] No sources found for ProjetID: ${projetId} and BdType: ${bdType}. Returning empty array.`);
//       return [];
//     }
//     console.log(`[getConfigurationSources] Fetched ${sources.length} sources for ProjetID: ${projetId}, BdType: ${bdType}.`);

//     // 2. Collect all unique user IDs from all source.autorisations (for the filtered sources)
//     const allUserIdsFromAutorisations = new Set<string>();
//     sources.forEach(source => {
//       if (source.autorisations) {
//         // Iterate over known keys of AutorisationsSourceDonnee
//         (Object.keys(source.autorisations) as Array<keyof AutorisationsSourceDonnee>).forEach(key => {
//           const userIdsForPermission = source.autorisations![key];
//           if (userIdsForPermission && Array.isArray(userIdsForPermission)) {
//             userIdsForPermission.forEach(userId => allUserIdsFromAutorisations.add(userId));
//           }
//         });
//       }
//     });

//     // 3. Fetch details for all these users in one batch
//     let usersFromAutorisationsMap: Map<string, UserEntity> = new Map();
//     if (allUserIdsFromAutorisations.size > 0) {
//       const userDetailsArray = await this.userservice.findby(Array.from(allUserIdsFromAutorisations));
//       userDetailsArray.forEach(user => {
//         // Ensure user and user.iduser are valid before adding to map
//         if (user && user.iduser) {
//             usersFromAutorisationsMap.set(user.iduser, user);
//         }
//       });
//     }

//     // 4. Mapper les sources to the desired output format
//     const result = sources.map((source) => {
//       // Get members of the current source's structure
//       // The path source.enquete.projet.structure should be valid due to the leftJoinAndSelect strategy
//       const structureEntity = source.enquete?.projet?.structure;
//       const membresDeStructure: MembreStruct[] = structureEntity?.membres ?? [];
      
//       const usersDeStructure = membresDeStructure.map((m) => ({
//         user: m.iduser,
//         username: `${m.name || ''} ${m.firstname || ''}`.trim(), // Handle potential null/undefined names
//         role: m.roleMembre,
//       }));

// // Function to format the 'autorisation' part based on Option B
//       const formatAutorisationsPourOptionB = (type: keyof AutorisationsSourceDonnee) => {
//         const idsFromSourceAuth = source.autorisations?.[type] ?? [];
//         return idsFromSourceAuth
//           .map(userId => {
//             const userDetail = usersFromAutorisationsMap.get(userId);
//             if (userDetail) {
//               // Attempt to find if this user is also a structure member to get their specific roleMembre
//               const structureMemberInfo = usersDeStructure.find(sm => sm.user === userDetail.iduser);
//               // Prioritize roleMembre if they are a structure member, otherwise use a general role from UserEntity if available
//               const roleToDisplay = structureMemberInfo 
//                                     ? structureMemberInfo.role 
//                                     : (userDetail as any).roleMembre || (userDetail as any).role || null; 

//               return {
//                 user: userDetail.iduser,
//                 username: `${userDetail.name || ''} ${userDetail.firstname || ''}`.trim(),
//                 role: roleToDisplay,
//               };
//             }
//             return null; // User ID was in autorisations but no details found (e.g., deleted user)
//           })
//           .filter(user => user !== null); // Remove nulls for users not found
//       };

//       return {
//         id: source.idsourceDonnes,
//         nombd: source.nomSource,
//         users: usersDeStructure, // Users from the source's specific structure
//         autorisation: { // Users specifically granted permission in source.autorisations (globally fetched)
//           modifier: formatAutorisationsPourOptionB('modifier'),
//           visualiser: formatAutorisationsPourOptionB('visualiser'),
//           telecharger: formatAutorisationsPourOptionB('telecharger'),
//         },
//       };
//     });

//     // console.log(`[getConfigurationSources] END - Returning ${result.length} processed sources for ProjetID: ${projetId}, BdType: ${bdType}`);
//     return result;
//   }



// async getConfigurationSources(
//     projetId: string,
//     bdType: 'normales' | 'jointes' | 'tous',
//     loggedInUser: MembreStruct,
//   ): Promise<any[]> {
//     console.log(`[getConfigurationSources] START - ProjetID: ${projetId}, BdType: ${bdType}`);

//     // 1. Verify project existence
//     const projetExists = await this.projetRepo.findOneBy({ idprojet: projetId });
//     if (!projetExists) {
//       throw new NotFoundException(`Projet with ID ${projetId} not found.`);
//     }

//     // 2. Fetch SuperAdmin
//     const superAdmin = await this.userrepo.findOne({ where: { role: UserRole.SuperAdmin } });
//     if (!superAdmin) {
//       console.warn('[getConfigurationSources] No SuperAdmin found in the database.');
//     }

//     // 3. Build the query for sources
//     const query = this.sourcededonneesrepo
//       .createQueryBuilder('source')
//       .innerJoin('source.enquete', 'enqueteFilter')
//       .innerJoin('enqueteFilter.projet', 'projetFilter', 'projetFilter.idprojet = :projetId', { projetId })
//       .leftJoinAndSelect('source.enquete', 'enqueteDetails')
//       .leftJoinAndSelect('enqueteDetails.projet', 'projetDetails')
//       .leftJoinAndSelect('projetDetails.structure', 'structure')
//       .leftJoinAndSelect('structure.membres', 'structureMembres');

//     if (bdType === 'normales') {
//       query.andWhere('source.bd_normales IS NOT NULL');
//     } else if (bdType === 'jointes') {
//       query.andWhere('source.bd_jointes IS NOT NULL');
//     } else if (bdType !== 'tous') {
//       throw new BadRequestException(`Type de BD "${bdType}" non supporté. Utilisez "normales", "jointes", ou "tous".`);
//     }

//     const sources = await query.getMany();

//     if (sources.length === 0) {
//       console.log(`[getConfigurationSources] No sources found for ProjetID: ${projetId} and BdType: ${bdType}. Returning empty array.`);
//       return [];
//     }
//     console.log(`[getConfigurationSources] Fetched ${sources.length} sources for ProjetID: ${projetId}, BdType: ${bdType}.`);

//     // 4. Collect all unique user IDs from autorisations
//     const allUserIdsFromAutorisations = new Set<string>();
//     sources.forEach(source => {
//       if (source.autorisations) {
//         (Object.keys(source.autorisations) as Array<keyof AutorisationsSourceDonnee>).forEach(key => {
//           const userIdsForPermission = source.autorisations![key];
//           if (userIdsForPermission && Array.isArray(userIdsForPermission)) {
//             userIdsForPermission.forEach(userId => allUserIdsFromAutorisations.add(userId));
//           }
//         });
//       }
//     });

//     // 5. Fetch user details and handle missing IDs
//     let usersFromAutorisationsMap: Map<string, UserEntity> = new Map();
//     if (allUserIdsFromAutorisations.size > 0) {
//       try {
//         const userDetailsArray = await this.userservice.findby(Array.from(allUserIdsFromAutorisations));
//         userDetailsArray.forEach(user => {
//           if (user && user.iduser) {
//             usersFromAutorisationsMap.set(user.iduser, user);
//           }
//         });
//       } catch (error) {
//         console.warn(`[getConfigurationSources] Certains utilisateurs non trouvés : ${error.message}`);
//         // Continue without throwing to avoid breaking the response
//       }
//     }

//     // 6. Map sources to the desired output format
//     const result = sources.map((source) => {
//       const structureEntity = source.enquete?.projet?.structure;
//       const membresDeStructure: MembreStruct[] = structureEntity?.membres ?? [];

//       const usersDeStructure = membresDeStructure.map((m) => ({
//         user: m.iduser,
//         username: `${m.name || ''} ${m.firstname || ''}`.trim(),
//         role: m.roleMembre,
//       }));

//       // Add SuperAdmin to users if not already included
//       if (superAdmin && !usersDeStructure.some(u => u.user === superAdmin.iduser)) {
//         usersDeStructure.push({
//           user: superAdmin.iduser,
//           username: `${superAdmin.name || ''} ${superAdmin.firstname || ''}`.trim(),
//           role: UserRole.SuperAdmin,
//         });
//       }

//       const formatAutorisationsPourOptionB = (type: keyof AutorisationsSourceDonnee) => {
//         const idsFromSourceAuth = source.autorisations?.[type] ?? [];
//         return idsFromSourceAuth
//           .map(userId => {
//             const userDetail = usersFromAutorisationsMap.get(userId) || (userId === superAdmin?.iduser ? superAdmin : null);
//             if (userDetail) {
//               const structureMemberInfo = usersDeStructure.find(sm => sm.user === userDetail.iduser);
//               const roleToDisplay = structureMemberInfo
//                 ? structureMemberInfo.role
//                 : (userDetail as any).roleMembre || (userDetail as any).role || null;

//               return {
//                 user: userDetail.iduser,
//                 username: `${userDetail.name || ''} ${userDetail.firstname || ''}`.trim(),
//                 role: roleToDisplay,
//               };
//             }
//             return null;
//           })
//           .filter(user => user !== null);
//       };

//       return {
//         id: source.idsourceDonnes,
//         nombd: source.nomSource,
//         users: usersDeStructure,
//         autorisation: {
//           modifier: formatAutorisationsPourOptionB('modifier'),
//           visualiser: formatAutorisationsPourOptionB('visualiser'),
//           telecharger: formatAutorisationsPourOptionB('telecharger'),
//         },
//       };
//     });

//     console.log(`[getConfigurationSources] END - Returning ${result.length} processed sources for ProjetID: ${projetId}, BdType: ${bdType}`);
//     return result;
//   }

async getOneConfigurationSource(
    projetId: string,
    sourceId: string,
    bdType: 'normales' | 'jointes' | 'tous',
    loggedInUser: MembreStruct,
  ): Promise<any> {
    console.log(`[getOneConfigurationSource] START - ProjetID: ${projetId}, SourceID: ${sourceId}, BdType: ${bdType}`);

    // 1. Verify project existence
    const projetExists = await this.projetRepo.findOneBy({ idprojet: projetId });
    if (!projetExists) {
      throw new NotFoundException(`Projet with ID ${projetId} not found.`);
    }

    // 2. Fetch SuperAdmin
    const superAdmin = await this.userrepo.findOne({ where: { role: UserRole.SuperAdmin } });
    if (!superAdmin) {
      console.warn('[getOneConfigurationSource] No SuperAdmin found in the database.');
    }

    // 3. Build the query for the source
    const query = this.sourcededonneesrepo
      .createQueryBuilder('source')
      .innerJoin('source.enquete', 'enqueteFilter')
      .innerJoin('enqueteFilter.projet', 'projetFilter', 'projetFilter.idprojet = :projetId', { projetId })
      .leftJoinAndSelect('source.enquete', 'enqueteDetails')
      .leftJoinAndSelect('enqueteDetails.projet', 'projetDetails')
      .leftJoinAndSelect('projetDetails.structure', 'structure')
      .leftJoinAndSelect('structure.membres', 'structureMembres')
      .where('source.idsourceDonnes = :sourceId', { sourceId });

    if (bdType === 'normales') {
      query.andWhere('source.bd_normales IS NOT NULL');
    } else if (bdType === 'jointes') {
      query.andWhere('source.bd_jointes IS NOT NULL');
    } else if (bdType !== 'tous') {
      throw new BadRequestException(`Type de BD "${bdType}" non supporté. Utilisez "normales", "jointes", ou "tous".`);
    }

    const source = await query.getOne();
    if (!source) {
      throw new NotFoundException(`Aucune source trouvée avec l'ID ${sourceId} pour le projet ${projetId}`);
    }

    // Debug: Log structure and members to diagnose empty users
    console.log(`[getOneConfigurationSource] Structure: ${JSON.stringify(source.enquete?.projet?.structure)}`);
    console.log(`[getOneConfigurationSource] Membres: ${JSON.stringify(source.enquete?.projet?.structure?.membres)}`);

    // 4. Collect user IDs from autorisations
    const allUserIdsFromAutorisations = new Set<string>();
    if (source.autorisations) {
      (Object.keys(source.autorisations) as Array<keyof AutorisationsSourceDonnee>).forEach(key => {
        const ids = source.autorisations![key];
        if (Array.isArray(ids)) {
          ids.forEach(uid => allUserIdsFromAutorisations.add(uid));
        }
      });
    }

    // 5. Fetch user details and handle missing IDs
    let usersFromAutorisationsMap: Map<string, UserEntity> = new Map();
    if (allUserIdsFromAutorisations.size > 0) {
      try {
        const userDetailsArray = await this.userservice.findby(Array.from(allUserIdsFromAutorisations));
        userDetailsArray.forEach(user => {
          if (user && user.iduser) {
            usersFromAutorisationsMap.set(user.iduser, user);
          }
        });
      } catch (error) {
        console.warn(`[getOneConfigurationSource] Certains utilisateurs non trouvés : ${error.message}`);
      }
    }

    // 6. Build users array, including structure members and SuperAdmin
    const structureEntity = source.enquete?.projet?.structure;
    const membresDeStructure: MembreStruct[] = structureEntity?.membres ?? [];

    const usersDeStructure = membresDeStructure.map((m) => ({
      user: m.iduser,
      username: `${m.name || ''} ${m.firstname || ''}`.trim(),
      role: m.roleMembre,
    }));

    // Add SuperAdmin to users if not already included
    if (superAdmin && !usersDeStructure.some(u => u.user === superAdmin.iduser)) {
      usersDeStructure.push({
        user: superAdmin.iduser,
        username: `${superAdmin.name || ''} ${superAdmin.firstname || ''}`.trim(),
        role: UserRole.SuperAdmin,
      });
    }

    // Debug: Log usersDeStructure to verify content
    console.log(`[getOneConfigurationSource] usersDeStructure: ${JSON.stringify(usersDeStructure)}`);

    const formatAutorisationsPourOptionB = (type: keyof AutorisationsSourceDonnee) => {
      const idsFromSourceAuth = source.autorisations?.[type] ?? [];
      return idsFromSourceAuth
        .map(userId => {
          const userDetail = usersFromAutorisationsMap.get(userId) || (userId === superAdmin?.iduser ? superAdmin : null);
          if (userDetail) {
            const structureMemberInfo = usersDeStructure.find(sm => sm.user === userDetail.iduser);
            const roleToDisplay = structureMemberInfo
              ? structureMemberInfo.role
              : (userDetail as any).roleMembre || (userDetail as any).role || null;

            return {
              user: userDetail.iduser,
              username: `${userDetail.name || ''} ${userDetail.firstname || ''}`.trim(),
              role: roleToDisplay,
            };
          }
          return null;
        })
        .filter(user => user !== null);
    };

    const result = {
      id: source.idsourceDonnes,
      nombd: source.nomSource,
      users: usersDeStructure,
      autorisation: {
        modifier: formatAutorisationsPourOptionB('modifier'),
        visualiser: formatAutorisationsPourOptionB('visualiser'),
        telecharger: formatAutorisationsPourOptionB('telecharger'),
      },
    };

    console.log(`[getOneConfigurationSource] END - Returning processed source for ProjetID: ${projetId}, SourceID: ${sourceId}`);
    return result;
  }


async getConfigurationSources(
    projetId: string,
    bdType: 'normales' | 'jointes' | 'tous',
    loggedInUser: MembreStruct,
  ): Promise<any[]> {
    console.log(`[getConfigurationSources] START - ProjetID: ${projetId}, BdType: ${bdType}`);

    // 1. Verify project existence
    const projetExists = await this.projetRepo.findOneBy({ idprojet: projetId });
    if (!projetExists) {
      throw new NotFoundException(`Projet with ID ${projetId} not found.`);
    }

    // 2. Fetch SuperAdmin
    const superAdmin = await this.userrepo.findOne({ where: { role: UserRole.SuperAdmin } });
    if (!superAdmin) {
      console.warn('[getConfigurationSources] No SuperAdmin found in the database.');
    }

    // 3. Build the query for sources
    const query = this.sourcededonneesrepo
      .createQueryBuilder('source')
      .innerJoin('source.enquete', 'enqueteFilter')
      .innerJoin('enqueteFilter.projet', 'projetFilter', 'projetFilter.idprojet = :projetId', { projetId })
      .leftJoinAndSelect('source.enquete', 'enqueteDetails')
      .leftJoinAndSelect('enqueteDetails.projet', 'projetDetails')
      .leftJoinAndSelect('projetDetails.structure', 'structure')
      .leftJoinAndSelect('structure.membres', 'structureMembres');

    if (bdType === 'normales') {
      query.andWhere('source.bd_normales IS NOT NULL');
    } else if (bdType === 'jointes') {
      query.andWhere('source.bd_jointes IS NOT NULL');
    } else if (bdType !== 'tous') {
      throw new BadRequestException(`Type de BD "${bdType}" non supporté. Utilisez "normales", "jointes", ou "tous".`);
    }

    const sources = await query.getMany();

    if (sources.length === 0) {
      console.log(`[getConfigurationSources] No sources found for ProjetID: ${projetId} and BdType: ${bdType}. Returning empty array.`);
      return [];
    }
    console.log(`[getConfigurationSources] Fetched ${sources.length} sources for ProjetID: ${projetId}, BdType: ${bdType}.`);

    // Debug: Log sources and their structures
    sources.forEach(source => {
      console.log(`[getConfigurationSources] Source ${source.idsourceDonnes} Structure: ${JSON.stringify(source.enquete?.projet?.structure)}`);
      console.log(`[getConfigurationSources] Source ${source.idsourceDonnes} Membres: ${JSON.stringify(source.enquete?.projet?.structure?.membres)}`);
    });

    // 4. Collect all unique user IDs from autorisations
    const allUserIdsFromAutorisations = new Set<string>();
    sources.forEach(source => {
      if (source.autorisations) {
        (Object.keys(source.autorisations) as Array<keyof AutorisationsSourceDonnee>).forEach(key => {
          const userIdsForPermission = source.autorisations![key];
          if (userIdsForPermission && Array.isArray(userIdsForPermission)) {
            userIdsForPermission.forEach(userId => allUserIdsFromAutorisations.add(userId));
          }
        });
      }
    });

    // 5. Fetch user details and handle missing IDs
    let usersFromAutorisationsMap: Map<string, UserEntity> = new Map();
    if (allUserIdsFromAutorisations.size > 0) {
      try {
        const userDetailsArray = await this.userservice.findby(Array.from(allUserIdsFromAutorisations));
        userDetailsArray.forEach(user => {
          if (user && user.iduser) {
            usersFromAutorisationsMap.set(user.iduser, user);
          }
        });
      } catch (error) {
        console.warn(`[getConfigurationSources] Certains utilisateurs non trouvés : ${error.message}`);
      }
    }

    // 6. Map sources to the desired output format
    const result = sources.map((source) => {
      const structureEntity = source.enquete?.projet?.structure;
      const membresDeStructure: MembreStruct[] = structureEntity?.membres ?? [];

      const usersDeStructure = membresDeStructure.map((m) => ({
        user: m.iduser,
        username: `${m.name || ''} ${m.firstname || ''}`.trim(),
        role: m.roleMembre,
      }));

      // Add SuperAdmin to users if not already included
      if (superAdmin && !usersDeStructure.some(u => u.user === superAdmin.iduser)) {
        usersDeStructure.push({
          user: superAdmin.iduser,
          username: `${superAdmin.name || ''} ${superAdmin.firstname || ''}`.trim(),
          role: UserRole.SuperAdmin,
        });
      }

      // Debug: Log usersDeStructure for this source
      console.log(`[getConfigurationSources] Source ${source.idsourceDonnes} usersDeStructure: ${JSON.stringify(usersDeStructure)}`);

      const formatAutorisationsPourOptionB = (type: keyof AutorisationsSourceDonnee) => {
        const idsFromSourceAuth = source.autorisations?.[type] ?? [];
        return idsFromSourceAuth
          .map(userId => {
            const userDetail = usersFromAutorisationsMap.get(userId) || (userId === superAdmin?.iduser ? superAdmin : null);
            if (userDetail) {
              const structureMemberInfo = usersDeStructure.find(sm => sm.user === userDetail.iduser);
              const roleToDisplay = structureMemberInfo
                ? structureMemberInfo.role
                : (userDetail as any).roleMembre || (userDetail as any).role || null;

              return {
                user: userDetail.iduser,
                username: `${userDetail.name || ''} ${userDetail.firstname || ''}`.trim(),
                role: roleToDisplay,
              };
            }
            return null;
          })
          .filter(user => user !== null);
      };

      return {
        id: source.idsourceDonnes,
        nombd: source.nomSource,
        users: usersDeStructure,
        autorisation: {
          modifier: formatAutorisationsPourOptionB('modifier'),
          visualiser: formatAutorisationsPourOptionB('visualiser'),
          telecharger: formatAutorisationsPourOptionB('telecharger'),
        },
      };
    });

    console.log(`[getConfigurationSources] END - Returning ${result.length} processed sources for ProjetID: ${projetId}, BdType: ${bdType}`);
    return result;
  }




 async togglePermissionsFromArray(
    idSourceDonnee: string,
    permissionOperations: UserPermissionToggleDto[], // Array of actions and users to toggle
    loggedInUser: MembreStruct,
  ): Promise<SourceDonnee> {
    console.log(`[togglePermissionsFromArray] START - User: ${loggedInUser.iduser}, SourceID: ${idSourceDonnee}`);
    console.log(`[togglePermissionsFromArray] Permission Operations: ${JSON.stringify(permissionOperations)}`);

    // --- AUTHORIZATION LOGIC (same as before) ---
    if (loggedInUser.role === 'client') {
      if (loggedInUser.roleMembre !== roleMembreEnum.TOPMANAGER) {
        throw new HttpException("Action non autorisée pour ce rôle client.", HttpStatus.FORBIDDEN);
      }
    } else {
      try {
        checkAdminAccess(loggedInUser);
      } catch (error) {
        throw error;
      }
    }
    // --- AUTHORIZATION LOGIC END ---

    // 1. Collect all unique user IDs from ALL operations in the input DTO for validation
    const allUserIdsToValidate = new Set<string>();
    permissionOperations.forEach(op => {
      if (op.userIds) op.userIds.forEach(id => allUserIdsToValidate.add(id));
    });

    if (allUserIdsToValidate.size > 0) {
      await this.userservice.findby(Array.from(allUserIdsToValidate)); // Validates all users exist
      console.log('[togglePermissionsFromArray] Validation of all involved users passed.');
    } else {
      // This would happen if the permissions array was empty or all userIds arrays within it were empty
      // (which should be caught by DTO validation if @ArrayNotEmpty is on UserPermissionToggleDto.userIds)
      console.log('[togglePermissionsFromArray] No user IDs provided in the payload to toggle.');
      // Consider throwing BadRequestException if an empty permissions array is not desired
      // For now, we proceed, and it will result in no changes.
    }

    // 2. Fetch the source
    const source = await this.sourcededonneesrepo.findOneBy({ idsourceDonnes: idSourceDonnee });
    if (!source) {
      throw new NotFoundException(`SourceDonnee with ID ${idSourceDonnee} not found.`);
    }

    // 3. Initialize autorisations if necessary
    if (!source.autorisations) {
      source.autorisations = {};
    }

    let overallChangesMade = false;

    // Iterate through each permission operation from the request
    for (const operation of permissionOperations) {
      const { action, userIds: userIdsToToggleForThisAction } = operation;

      // DTO validation should ensure userIdsToToggleForThisAction is not empty if an operation is provided.
      // If somehow it's empty here, skip.
      if (!userIdsToToggleForThisAction || userIdsToToggleForThisAction.length === 0) {
        // console.warn(`[togglePermissionsFromArray] Skipping action '${action}' as no user IDs were provided for it.`);
        continue;
      }
      
      if (!source.autorisations![action]) {
        source.autorisations![action] = [];
      }

      const currentActionArray = source.autorisations![action] as string[];
      let newActionArray = [...currentActionArray]; // Work on a copy

      let actionSpecificChangesMade = false;
      for (const userId of userIdsToToggleForThisAction) {
        const userIndex = newActionArray.indexOf(userId);
        if (userIndex > -1) { // User is in the list, so remove
          newActionArray.splice(userIndex, 1);
          // console.log(`[togglePermissionsFromArray] User ${userId} REMOVED from action '${action}'.`);
          actionSpecificChangesMade = true;
        } else { // User is not in the list, so add
          newActionArray.push(userId);
          // console.log(`[togglePermissionsFromArray] User ${userId} ADDED to action '${action}'.`);
          actionSpecificChangesMade = true;
        }
      }
      
      if (actionSpecificChangesMade) {
          source.autorisations![action] = newActionArray;
          overallChangesMade = true; // Mark that at least one action had changes
          // console.log(`[togglePermissionsFromArray] Permissions for action '${action}' effectively changed for source ${idSourceDonnee}.`);
      }
    }


    if (overallChangesMade) {
      // Crucial: re-assign the top-level 'autorisations' object for TypeORM change detection
      source.autorisations = { ...source.autorisations }; 
      
      // console.log(`[togglePermissionsFromArray] Overall permissions updated for source ${idSourceDonnee}.`);
      try {
        const savedSource = await this.sourcededonneesrepo.save(source);
        // console.log(`[togglePermissionsFromArray] SAVE SUCCEEDED for source ${idSourceDonnee}.`);
        return savedSource;
      } catch (error) {
        // console.error(`[togglePermissionsFromArray] SAVE FAILED for source ${idSourceDonnee}:`, error);
        throw new HttpException('Failed to save source autorisations.', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    } else {
      // console.log(`[togglePermissionsFromArray] No effective changes made to permissions for source ${idSourceDonnee}.`);
      return source; // Return original source if no actual change
    }
  }

  async removeUsersFromAutorisation(
    idSourceDonnee: string,
    userIds: string[],
    action: keyof AutorisationsSourceDonnee,
  ): Promise<SourceDonnee> {
     if (!userIds || userIds.length === 0) {
        throw new BadRequestException('userIds array cannot be empty.');
    }

    const source = await this.sourcededonneesrepo.findOneBy({ idsourceDonnes: idSourceDonnee });
    if (!source) {
      throw new NotFoundException(`SourceDonnee with ID ${idSourceDonnee} not found.`);
    }

    if (!source.autorisations || !source.autorisations[action] || source.autorisations[action]?.length === 0) {
      // console.log(`No '${action}' permissions found or list is empty for source ${idSourceDonnee}. No users removed.`);
      return source;
    }

    const actionArray = source.autorisations[action] as string[];
    const initialLength = actionArray.length;

    // Create a Set of userIds to remove for efficient lookup
    const usersToRemoveSet = new Set(userIds);
    const updatedActionArray = actionArray.filter(id => !usersToRemoveSet.has(id));

    if (updatedActionArray.length < initialLength) {
      // console.log(`${initialLength - updatedActionArray.length} users removed from '${action}' permission for source ${idSourceDonnee}.`);
      // Re-assign for TypeORM change detection
      source.autorisations = { ...source.autorisations, [action]: updatedActionArray };
      return this.sourcededonneesrepo.save(source);
    } else {
      // console.log(`No users from the provided list were found in '${action}' permissions for source ${idSourceDonnee}.`);
      return source; // Return unmodified source
    }
  }



 

//_______________suppression

 async softDeleteSourceDonnee(
    idsourceDonnes: string,
    currentUser: UserEntity, // Ou le type de votre utilisateur/membre authentifié
  ): Promise<{ message: string }> {
    
    const sourceDonnee = await this.sourcededonneesrepo.findOne({
      where: { idsourceDonnes },
      relations: ['enquete', 'enquete.projet', 'enquete.projet.structure'], // Pour vérifier les permissions
    });

    if (!sourceDonnee) {
      throw new NotFoundException(`Source de données avec l'ID ${idsourceDonnes} non trouvée.`);
    }
    let canDelete = false;
    if (currentUser.role !== UserRole.Client) { // SuperAdmin
        canDelete = true;
    
    }
    // Vous pourriez aussi vérifier les `sourceDonnee.autorisations` ici

    if (!canDelete) {
      throw new ForbiddenException("Vous n'avez pas les droits pour supprimer cette source de données.");
    }

    try {
      const result = await this.sourcededonneesrepo.delete(idsourceDonnes);

      if (result.affected === 0) {
        throw new NotFoundException(`Source de données avec l'ID ${idsourceDonnes} non trouvée pour la suppression (après vérification).`);
      }

      return { message: `Source de données avec l'ID ${idsourceDonnes} marquée comme supprimée avec succès.` };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`Erreur lors du soft delete de la source de données ${idsourceDonnes}`, err.stack);
      throw new HttpException('Erreur interne du serveur lors de la suppression de la source de données.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }



  //archiver une bd

  async archive(idSource:string,user:any){
try{
 const source= await this.sourcededonneesrepo.findOne({where:{idsourceDonnes:idSource}})
  if(user.role==UserRole.Client){
    throw new ForbiddenException("seul le SuperAdmin peut archivé une source de données!")
  }
  if(!source){
      throw new HttpException(`aucune source trouvé pour la source `,HttpStatus.NOT_FOUND)
  }


  source.bd_archive=true
return this.sourcededonneesrepo.save(source)

}
catch(err){

}
   
  }











 

}

