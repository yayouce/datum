import { HttpException, Injectable } from '@nestjs/common';
import { CreateProjetDto } from './dto/create-projet.dto';
import { UpdateProjetDto } from './dto/update-projet.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Projet } from './entities/projet.entity';
import { Repository } from 'typeorm';
import { roleMembreEnum } from 'src/generique/rolemembre.enum';
import { StructureService } from '@/structure/structure.service';
import { etatprojetEnum } from '@/generique/etatprojetEnum.enum';

@Injectable()
export class ProjetService {

  constructor(
    @InjectRepository(Projet)
    private projetRepo:Repository<Projet>,
    private structureservice: StructureService
  ) {}



  async getAll() {
    try {
      const projet = await this.projetRepo.find();
      return projet;
    } catch (err) {
      throw err
    }
  }


  async getTotalProjetsParEtat() {
    try {
        // Étape 1 : Définir les états possibles
        const etatsPossibles = ['Arret', 'En_cours', 'En_attente', 'En_pause'];

        // Étape 2 : Effectuer la requête pour compter les projets par état
        const result = await this.projetRepo
            .createQueryBuilder('projet')
            .select('projet.etatprojet', 'etatprojet')
            .addSelect('COUNT(idprojet)', 'total')
            .where('projet.etatprojet IN (:...etats)', { etats: etatsPossibles })
            .groupBy('projet.etatprojet')
            .getRawMany();

        // Étape 3 : Assembler le résultat final
        const totals = etatsPossibles.reduce((acc, etat) => {
            const found = result.find(item => item.etatprojet === etat);
            acc[etat] = found ? parseInt(found.total, 10) : 0;
            return acc;
        }, {});

        return totals;
    } catch (err) {
        throw err;
    }
}




  // async getMyAll(user) {
  //   try {
  //     const projet = await this.projetRepo.find();
  //     return projet;
  //   } catch (err) {
  //     throw err
  //   }
  // }


  async getById(idprojet){
    try{
      const projet  =await this.projetRepo.findOneBy({idprojet})
      return projet
    }
    catch(err){
      throw new HttpException(err.message,800)
    }
  }
  
    
  async createProjet(CreateProjetdto: CreateProjetDto, user) {
    const { nomstructure, ...creation } = CreateProjetdto;
    try {

      const structure = await this.structureservice.getStructureByname(nomstructure)
      if(!structure){throw new HttpException('structure non trouvé!',700)}
      // if (user?.roleMembre !== roleMembreEnum.TOPMANAGER) {
      //   throw new HttpExceptionseserddrdrdrdrdrdrd("pas autorisé à ajouter projet",702);
      // }
      const newProjet = this.projetRepo.create({
        ...creation,
        // membreStruct: user,
        structure:structure,
        etatprojet:etatprojetEnum.En_cours,
        nomStructure:structure.nomStruct
      });
      return await this.projetRepo.save(newProjet)
    } catch (err) {
      throw new HttpException(err.message,803)
    }
  }

  async updateProjet(idprojet: string, updateProjet: UpdateProjetDto, user) {
    const { membreStruct, ...updatedData } = updateProjet;
  
    try {

      const projet = await this.projetRepo.findOne({ where: { idprojet } });
      if (!projet) {
        throw new HttpException('Projet non trouvé', 705);
      }
  
      // Vérifier si l'utilisateur appartient à la même structure que le projet
      // if (user.structure.nomStruct !== projet.nomStructure) {
      //   throw new HttpException("Ce projet ne vous appartient pas", 803);
      // }
  
      // Mettre à jour le projet
      await this.projetRepo.update(idprojet, {
        ...updatedData,
        // membreStruct: user,
      });
  
      // Récupérer le projet mis à jour
      const updatedProjet = await this.projetRepo.findOne({ where: { idprojet } });
  
      return updatedProjet;
    } catch (err) {
      throw new HttpException(err.message, 803);
    }
  }
  

  async softDeleteProjet(idprojet: string) {
    try {
      if (!idprojet) {
        throw new HttpException('ID du projet requis', 400);
      }
  
      // Vérifier si le projet existe
      const projet = await this.projetRepo.findOne({ where: { idprojet } });
  
      if (!projet) {
        throw new HttpException('Projet non trouvé', 705);
      }
  
      // Effectuer le soft delete
      await this.projetRepo.softDelete(idprojet);
  
      return {
        message: 'Projet supprimé avec succès (soft delete).',
        idprojet: idprojet
      };
    } catch (err) {
      throw new HttpException(err.message, 803);
    }
  }
  


  
  //liste des sources de données par projet 
}