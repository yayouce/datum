import { HttpException, Injectable, BadRequestException } from '@nestjs/common';
import { CreateSourceDonneeDto } from './dto/create-source_donnee.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { SourceDonnee } from './entities/source_donnee.entity';
import { Repository } from 'typeorm';
import { DataTypeService } from 'src/data_type/data_type.service';
import { FormatfichierService } from 'src/formatfichier/formatfichier.service';
import { UnitefrequenceService } from 'src/frequence/unitefrequence.service';
import { EnqueteService } from 'src/enquete/enquete.service';
import { isURL } from 'class-validator';
import { FileHandlerService } from 'src/utils/file-handler.service';

@Injectable()
export class SourceDonneesService {
  constructor(
    @InjectRepository(SourceDonnee)
    private sourcededonneesrepo: Repository<SourceDonnee>,
    private datatypeservice: DataTypeService,
    private formatservice: FormatfichierService,
    private unitefrequence: UnitefrequenceService,
    private enqueteservice: EnqueteService,
    private fileHandlerService: FileHandlerService
  ) {}

  async CreationSourcededonnees(data: CreateSourceDonneeDto, idenquete: string) {
    const { libelleformat, libelletypedonnees, libelleunite, ...reste } = data;

      // 2. Récupération des entités associées
      const typedonnees = await this.datatypeservice.getoneByLibelle(libelletypedonnees);
      const format = await this.formatservice.getoneByLibelle(libelleformat);
      const unitefrequence = await this.unitefrequence.getoneBylibelle(libelleunite);
      const enquetedata = await this.enqueteservice.getenqueteByID(idenquete);

      // 3. Création de l'entité SourceDonnee
      const newsourcedonnes = this.sourcededonneesrepo.create({
        ...reste,
        enquete: enquetedata,
        libelleformat: format.libelleFormat,
        libelletypedonnees: typedonnees.libelledatatype,
        libelleunite: unitefrequence.libelleunitefrequence,
        typedonnes: typedonnees,
        format: format,
  
      });

      // 4. Sauvegarde dans la base de données
      return await this.sourcededonneesrepo.save(newsourcedonnes);
    } catch (err) {
      throw new HttpException(err.message, 801);
    }


    async getAllsource(){
      try{
         return await this.sourcededonneesrepo.find()
      }
      catch(err){
        throw new HttpException(err.message,804)
        
      }
    }



    async getSourceById(idsourceDonnes: string): Promise<SourceDonnee> {
      const source = await this.sourcededonneesrepo.findOne({
        where: { idsourceDonnes },
      });
      if (!source) {
        throw new BadRequestException(`Source de données avec l'ID ${idsourceDonnes} non trouvée.`);
      }
      return source;
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

   

}

