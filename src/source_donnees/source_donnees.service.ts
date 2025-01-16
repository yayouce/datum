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
import { getSheetOrDefault } from './getSheetOrdefault';
import { generateNextColumnLetter } from './generateNextColumnLetter';
import { addColumnDto } from './dto/addcolumn.dto';
import { modifyColumnDto } from './dto/modify.dto';
import { removeColumnDto } from './dto/removeclumn.dto';


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



//----------------Ajout de nouvelle colonne 
async addColumn(
  idsource,
body:addColumnDto
): Promise<SourceDonnee> {

  const { nomFeuille, nomColonne } = body;
  if (!nomColonne) {
    throw new HttpException(' la source et le nom de la nouvelle colonne sont obligatoires.',701);
  }
  // Étape 1 : Récupérer la source de données
  const source = await this.getSourceById(idsource);
  const fichier = source.fichier;

  // Étape 2 : Récupérer la feuille ou les données principales
  const sheet = getSheetOrDefault(fichier, nomFeuille);
  if (!sheet.donnees || sheet.donnees.length === 0) {
    throw new HttpException(`La feuille spécifiée est vide ou mal initialisée.`, 806);
  }
  const headers = sheet.donnees[0]; // Première ligne contient les entêtes
  if (Object.values(headers).includes(nomColonne)) {
    throw new HttpException(`L'entête "${nomColonne}" existe déjà.`, 805);
  }
  const newColumnLetter =generateNextColumnLetter(sheet.colonnes);
  headers[`${newColumnLetter}1`] = nomColonne;
  sheet.colonnes.push(newColumnLetter);

  sheet.donnees.slice(1).forEach((row, index) => {
    row[`${newColumnLetter}${index + 2}`] = null; // Initialiser à null
  });
  source.fichier = fichier;
  return await this.sourcededonneesrepo.save(source);
}



//----------------- modification de colonne

async modifyColumn(
  idsourceDonnes: string,
 body:modifyColumnDto // Transformation des valeurs (facultatif)
): Promise<SourceDonnee> {

  const { nomFeuille, nomColonne, newnomColonne, transform } = body;
  const source = await this.getSourceById(idsourceDonnes);
  const fichier = source.fichier;
  const sheet = getSheetOrDefault(fichier, nomFeuille);
  if (!sheet.donnees || sheet.donnees.length === 0) {
    throw new HttpException(`La feuille spécifiée est vide ou mal initialisée.`, 806);
  }
  const headers = sheet.donnees[0]; 
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

  source.fichier = fichier;
  return await this.sourcededonneesrepo.save(source);
}



// suppression

async removeColumn(
  idsource: string,
  body:removeColumnDto
): Promise<SourceDonnee> {
  const source = await this.getSourceById(idsource);
  const fichier = source.fichier;
  const { nomFeuille, nomColonne } = body;
  const sheet = getSheetOrDefault(fichier, nomFeuille);
  if (!sheet.donnees || sheet.donnees.length === 0) {
    throw new HttpException(`La feuille spécifiée est vide ou mal initialisée.`, 806);
  }

  // Étape 4 : Trouver la lettre associée à l'entête
  const headers = sheet.donnees[0]; // Première ligne contient les entêtes
  const columnLetter = Object.keys(headers).find(
    (key) => headers[key] === nomColonne
  );

  if (!columnLetter) {
    throw new HttpException(`L'entête "${nomColonne}" n'existe pas.`, 803);
  }

  delete headers[columnLetter]; // Supprimer l'entête
  sheet.donnees.slice(1).forEach((row, index) => {
    delete row[`${columnLetter}${index + 2}`];
  });
  sheet.colonnes = sheet.colonnes.filter((col) => col !== columnLetter);
  source.fichier = fichier;
  return await this.sourcededonneesrepo.save(source);
}





   

}

