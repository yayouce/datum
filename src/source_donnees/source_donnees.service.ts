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
import { ApplyFunctionDto } from './dto/ApplyFunctionDto.dto';


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
        bd_normales: data.fichier||data.source,
  
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
    
      // Transformer `fichier` pour le format attendu
      const transformedFichier = Object.entries(source.fichier).reduce(
        (acc, [sheetName, sheetData]) => {
          acc.push({ [sheetName]: sheetData });
          return acc;
        },
        []
      );
    
      return {
        ...source,
        fichier: transformedFichier,
      };
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



async getBdsByProjetWithFilter(
  idprojet: string,
  bdType: 'normales' | 'jointes' | 'tous'
): Promise<any[]> {
  // Récupérer toutes les sources du projet
  const sources = await this.sourcededonneesrepo.find({
    where: { enquete: { projet: { idprojet } } },
    relations: ['enquete', 'enquete.projet'], // Charge les relations nécessaires
  });

  // Appliquer le filtre en fonction du paramètre `bdType`
  if (bdType === 'normales') {
    return sources
      .filter((source) => source.bd_normales)
      .map((source) => ({
        nomSource: source.nomSource,
        idsource:source.idsourceDonnes
        // bd_jointes: source.bd_normales,
      }));
  }

  if (bdType === 'jointes') {
    return sources
      .filter((source) => source.bd_jointes)
      .map((source) => ({
        nomSource: source.nomSource,
        idsource:source.idsourceDonnes
        // bd_jointes: source.bd_jointes,
      }));;
  }

  if (bdType === 'tous') {
    return sources.map((source) => ({
      nomSource: source.nomSource,
      // bd_normales: source.bd_normales || null,
      idsource:source.idsourceDonnes
      // bd_jointes: source.bd_jointes || null,
    }));
  }

  throw new HttpException(`Type "${bdType}" non supporté. Utilisez "normales", "jointes", ou "tous".`, 800);
}











//----------------Ajout de nouvelle colonne 
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

  // Initialiser les valeurs de la colonne à null
  sheet.donnees.slice(1).forEach((row, index) => {
    row[`${newColumnLetter}${index + 2}`] = null;
  });

  // Étape 5 : Sauvegarder les modifications
  fichier[nomFeuille] = sheet; // Met à jour la feuille dans l'objet `fichier`
  source.fichier = fichier;

  return await this.sourcededonneesrepo.save(source);
}






//----------------- modification de colonne

async modifyColumn(
  idsourceDonnes: string,
  body: modifyColumnDto // Transformation des valeurs (facultatif)
): Promise<SourceDonnee> {
  const { nomFeuille, nomColonne, newnomColonne, transform } = body;

  // Étape 1 : Récupérer la source de données
  const source = await this.getSourceById(idsourceDonnes);
  const fichier = source.fichier;

  // Étape 2 : Gérer le cas où `nomFeuille` est vide ou non spécifié
  const targetSheetName = nomFeuille && nomFeuille.trim() ? nomFeuille : Object.keys(fichier[0])[0]; // Récupérer le nom de la première feuille
  const sheetObject = fichier.find((sheetObj) => sheetObj[targetSheetName]);

  if (!sheetObject) {
    throw new HttpException(`La feuille spécifiée "${targetSheetName}" n'existe pas.`, 803);
  }

  const sheet = sheetObject[targetSheetName];

  if (!sheet.donnees || sheet.donnees.length === 0) {
    throw new HttpException(`La feuille spécifiée est vide ou mal initialisée.`, 806);
  }

  // Étape 3 : Identifier la lettre de la colonne
  const headers = sheet.donnees[0]; // Première ligne contient les entêtes
  const columnLetter = Object.keys(headers).find(
    (key) => headers[key] === nomColonne
  );

  if (!columnLetter) {
    throw new HttpException(`L'entête "${nomColonne}" n'existe pas.`, 404);
  }

  // Étape 4 : Renommer la colonne si nécessaire
  if (newnomColonne) {
    headers[columnLetter] = newnomColonne;
  }

  // Étape 5 : Appliquer une transformation sur les valeurs, si spécifié
  if (transform) {
    sheet.donnees.slice(1).forEach((row, index) => {
      const cellKey = `${columnLetter}${index + 2}`;
      if (row[cellKey] !== undefined) {
        row[cellKey] = transform(row[cellKey]); // Appliquer la transformation
      }
    });
  }

  // Étape 6 : Mettre à jour la feuille dans le fichier
  const sheetIndex = fichier.findIndex((sheetObj) => sheetObj[targetSheetName]);
  if (sheetIndex >= 0) {
    fichier[sheetIndex][targetSheetName] = sheet; // Mettre à jour la feuille
  } else {
    throw new HttpException(`La feuille "${targetSheetName}" est introuvable.`, 803);
  }

  // Étape 7 : Sauvegarder dans la base de données
  source.fichier = fichier;
  return await this.sourcededonneesrepo.save(source);
}




// suppression

async removeColumn(
  idsource: string,
  body: removeColumnDto
): Promise<SourceDonnee> {
  const { nomFeuille, nomColonne } = body;

  // Étape 1 : Récupérer la source de données
  const source = await this.getSourceById(idsource);
  const fichier = source.fichier;

  // Étape 2 : Récupérer la feuille ou la première feuille par défaut
  const targetSheetName = nomFeuille && nomFeuille.trim() ? nomFeuille : Object.keys(fichier[0])[0];
  const sheetObject = fichier.find((sheetObj) => sheetObj[targetSheetName]);

  if (!sheetObject) {
    throw new HttpException(`La feuille spécifiée "${targetSheetName}" n'existe pas.`, 803);
  }

  const sheet = sheetObject[targetSheetName];

  // Vérifier si la feuille est valide
  if (!sheet.donnees || sheet.donnees.length === 0) {
    throw new HttpException(`La feuille spécifiée est vide ou mal initialisée.`, 806);
  }

  // Étape 3 : Identifier la lettre de la colonne à partir de la référence (ex. "D1")
  const columnLetter = nomColonne.replace(/\d/g, ''); // Extraire la lettre de colonne
  if (!sheet.colonnes.includes(columnLetter)) {
    throw new HttpException(`La colonne référencée "${nomColonne}" n'existe pas.`, 803);
  }

  // Étape 4 : Supprimer l'entête et les données associées
  const headers = sheet.donnees[0]; // Première ligne contient les entêtes
  const headerKey = Object.keys(headers).find((key) => key.startsWith(columnLetter));
  if (!headerKey) {
    throw new HttpException(`Impossible de trouver l'entête correspondant à "${nomColonne}".`, 803);
  }

  delete headers[headerKey]; // Supprimer l'entête
  sheet.donnees.slice(1).forEach((row, index) => {
    delete row[`${columnLetter}${index + 2}`]; // Supprimer les données ligne par ligne
  });

  // Étape 5 : Mettre à jour la liste des colonnes
  sheet.colonnes = sheet.colonnes.filter((col) => col !== columnLetter);

  // Étape 6 : Mettre à jour la feuille dans le fichier
  const sheetIndex = fichier.findIndex((sheetObj) => sheetObj[targetSheetName]);
  if (sheetIndex >= 0) {
    fichier[sheetIndex][targetSheetName] = sheet; // Mettre à jour la feuille
  } else {
    throw new HttpException(`La feuille "${targetSheetName}" est introuvable.`, 803);
  }
  // Étape 7 : Sauvegarder les modifications
  source.fichier = fichier;
  return await this.sourcededonneesrepo.save(source);
}





async applyFunctionAndSave(
  idsourceDonnes: string,
  applyFunctionDto: ApplyFunctionDto
): Promise<SourceDonnee> {
  const { nomFeuille, columnReferences, operation, separator, newnomcolonne } = applyFunctionDto;

  // Étape 1 : Récupérer la source de données
  const source = await this.getSourceById(idsourceDonnes);
  const fichier = source.fichier;

  // Étape 2 : Récupérer la feuille ou la première feuille si `nomFeuille` est vide
  const targetSheetName = nomFeuille && nomFeuille.trim() ? nomFeuille : Object.keys(fichier[0])[0];
  const sheetObject = fichier.find((sheetObj) => sheetObj[targetSheetName]);

  if (!sheetObject) {
    throw new HttpException(`La feuille spécifiée "${targetSheetName}" n'existe pas.`, 803);
  }

  const sheet = sheetObject[targetSheetName];

  // Vérifier si la feuille est valide
  if (!sheet.donnees || sheet.donnees.length <= 1) {
    throw new HttpException(
      `La feuille spécifiée est vide ou ne contient pas de données.`,
      806
    );
  }

  // Étape 3 : Valider les colonnes sélectionnées
  const headers = sheet.donnees[0]; // Première ligne contient les entêtes
  const columnLetters = columnReferences.map((reference) => {
    const columnLetter = reference.replace(/\d/g, ''); // Extraire la lettre (e.g., "D" from "D1")
    if (!sheet.colonnes.includes(columnLetter)) {
      throw new HttpException(
        `La colonne référencée "${reference}" n'existe pas.`,
        803
      );
    }
    return columnLetter;
  });

  // Étape 4 : Extraire les valeurs des colonnes cibles
  const columnValues = columnLetters.map((letter) =>
    sheet.donnees.slice(1).map((row, index) => {
      const cellKey = `${letter}${index + 2}`; // Générer la clé (e.g., "D2", "D3", ...)
      const value = row[cellKey];
      return value !== undefined && value !== null ? value : null;
    })
  );

  // Étape 5 : Appliquer la fonction avec vérification
  let columnResult: any[] = [];
  try {
    switch (operation.toLowerCase()) {
      case 'sum': {
        columnResult = columnValues[0].map(() =>
          columnValues[0].reduce((acc, val) => acc + (parseFloat(val) || 0), 0)
        );
        break;
      }
      case 'average': {
        const avg =
          columnValues[0].reduce((acc, val) => acc + (parseFloat(val) || 0), 0) /
          columnValues[0].length;
        columnResult = columnValues[0].map(() => avg);
        break;
      }
      case 'max': {
        const max = Math.max(...columnValues[0].map((val) => parseFloat(val) || 0));
        columnResult = columnValues[0].map(() => max);
        break;
      }
      case 'min': {
        const min = Math.min(...columnValues[0].map((val) => parseFloat(val) || 0));
        columnResult = columnValues[0].map(() => min);
        break;
      }
      case 'count': {
        const count = columnValues[0].length;
        columnResult = columnValues[0].map(() => count);
        break;
      }
      case 'concat': {
        // Concaténation des colonnes
        columnResult = columnValues[0].map((_, index) =>
          columnLetters
            .map((_, colIndex) => columnValues[colIndex][index]?.toString() || '')
            .join(separator || ' ')
        );
        break;
      }
      default:
        throw new HttpException(`L'opération "${operation}" n'est pas supportée.`, 400);
    }
  } catch (err) {
    throw new HttpException(
      `L'opération "${operation}" n'est pas possible pour les colonnes sélectionnées.`,
      400
    );
  }

  // Étape 6 : Ajouter une nouvelle colonne avec les résultats
  const newColumnLetter = generateNextColumnLetter(sheet.colonnes);
  sheet.colonnes.push(newColumnLetter); // Ajouter la colonne à la liste des colonnes existantes
  sheet.donnees[0][`${newColumnLetter}1`] = newnomcolonne; // Ajouter l'entête

  sheet.donnees.slice(1).forEach((row, index) => {
    row[`${newColumnLetter}${index + 2}`] = columnResult[index]; // Enregistrer le résultat pour chaque ligne
  });

  // Étape 7 : Sauvegarder dans la base de données
  const updatedSheetIndex = fichier.findIndex((sheetObj) => sheetObj[targetSheetName]);
  fichier[updatedSheetIndex][targetSheetName] = sheet;
  source.fichier = fichier;

  return await this.sourcededonneesrepo.save(source);
}










}

