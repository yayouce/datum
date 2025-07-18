import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateProjetDto } from './dto/create-projet.dto';
import { UpdateProjetDto } from './dto/update-projet.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Projet } from './entities/projet.entity';
import { IsNull, Repository } from 'typeorm';
import { roleMembreEnum } from 'src/generique/rolemembre.enum';
import { StructureService } from '@/structure/structure.service';
import { etatprojetEnum } from '@/generique/etatprojetEnum.enum';
import { UserEntity } from '@/user/entities/user.entity';
import { MembreStruct } from '@/membre-struct/entities/membre-struct.entity';
import { UserRole } from '@/generique/userroleEnum';
import { count } from 'console';

@Injectable()
export class ProjetService {

  constructor(
    @InjectRepository(Projet)
    private projetRepo:Repository<Projet>,
    private structureservice: StructureService
  ) {}



  // async getAll() {
  //   try {
  //     const projet = await this.projetRepo.find();
  //     return projet;
  //   } catch (err) {
  //     throw err
  //   }
  // }




  async getAll(user:any): Promise<Projet[]> {
    try {
      let projets: Projet[];
      if(user.role=="client"){

        projets = await this.projetRepo.find({
          where: { structure: { nomStruct: user.nomStruct } },
        });
      }else{
        projets=await this.projetRepo.find()
      }
      return projets;
    } catch (err) {
      console.error("Erreur lors de la récupération des projets:", err.message);
      throw new HttpException(err.message,800);
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




// async getMyAll(user:any) {
//   try {
//     const projet = await this.projetRepo.find({
//       where: { membreStruct: { iduser: user.idStruct } },
//     });
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
    const { nomStructure, ...creation } = CreateProjetdto;
    try {
      const structure = await this.structureservice.getStructureByname(nomStructure)
      if(!structure){throw new HttpException('structure non trouvé!',700)}
      if (user?.roleMembre !== roleMembreEnum.TOPMANAGER && user?.role=="client") {
        throw new HttpException("pas autorisé à ajouter un projet à pour cette structure",702);
      }
      const newProjet = this.projetRepo.create({
        ...creation,
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
    const { membreStruct,nomStructure, ...updatedData } = updateProjet;
  
    try {

      const structure = await this.structureservice.getStructureByname(nomStructure)
      if(!structure){throw new HttpException('structure non trouvé!',700)}

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
        structure:structure,
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
  

  async DeleteProjet(idprojets: string[], user: UserEntity | MembreStruct) {

  try {
    if (user.role === UserRole.Client) {
      throw new HttpException("Seul le superAdmin peut supprimer un projet", HttpStatus.FORBIDDEN);
    }

    if (!idprojets || idprojets.length === 0) {
      throw new HttpException('Aucun id passé en paramètre', 701);
    }

    const notFoundIds: string[] = [];
    let nbdelete = 0;

    for (const id of idprojets) {
      const projet = await this.projetRepo.findOne({ where: { idprojet: id } });

      if (!projet) {
        notFoundIds.push(id);
        continue;
      }

      await this.projetRepo.delete(id);
      nbdelete++;
    }

    if (notFoundIds.length > 0) {
      throw new HttpException(
        `Les projets suivants sont introuvables : ${notFoundIds.join(', ')}`,
        702
      );
    }

    return {
      message: "Projets supprimés avec succès.",
      deletedCount: nbdelete,
    };

  } catch (err) {
    throw new HttpException(err.message, HttpStatus.NOT_FOUND);
  }
}




  // --- Méthodes pour le Dashboard ---

  async countProjetsByEtatGlobal(etat: etatprojetEnum): Promise<number> {
    try {
      return await this.projetRepo.count({
        where: {
          etatprojet: etat,
          deletedAt: IsNull(), // Compter uniquement les projets actifs
        },
      });
    } catch (err) {
      throw new HttpException(`Erreur lors du comptage global des projets par état ${etat}.`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async countProjetsInStructure(idStruct: string): Promise<number> {
    try {
      return await this.projetRepo.count({
        where: {
          structure: { idStruct: idStruct },
          deletedAt: IsNull(), // Compter uniquement les projets actifs de cette structure
        },
      });
    } catch (err) {
      throw new HttpException(`Erreur lors du comptage des projets pour la structure ${idStruct}.`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async countProjetsInStructureByEtat(idStruct: string, etat: etatprojetEnum): Promise<number> {
    try {
      return await this.projetRepo.count({
        where: {
          structure: { idStruct: idStruct },
          etatprojet: etat,
          deletedAt: IsNull(), // Compter uniquement les projets actifs de cet état pour cette structure
        },
      });
    } catch (err) {
      throw new HttpException(`Erreur lors du comptage des projets pour la structure ${idStruct} avec l'état ${etat}.`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}