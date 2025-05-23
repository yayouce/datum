import { BadRequestException, ForbiddenException, forwardRef, HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateStructureDto } from './dto/create-structure.dto';

import { InjectRepository } from '@nestjs/typeorm';
import { Structure } from './entities/structure.entity';
import { IsNull, Not, Repository } from 'typeorm';
import { OrgChartNodeDto } from './dto/organigramme.dto';
import { MembreStruct } from '@/membre-struct/entities/membre-struct.entity';
import { checkAdminAccess } from '@/utils/auth.utils';
import { roleMembreEnum } from '@/generique/rolemembre.enum';
import { ProjetService } from '@/projet/projet.service';
import { UserEntity } from '@/user/entities/user.entity';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { MembreStructService } from '@/membre-struct/membre-struct.service';
import { etatprojetEnum } from '@/generique/etatprojetEnum.enum';
import { UserRole } from '@/generique/userroleEnum';


@Injectable()
export class StructureService {
  constructor(
    @InjectRepository(Structure)
    private structureRepo:Repository<Structure>,
    @InjectRepository(MembreStruct)
    private membreStructRepository: Repository<MembreStruct>,
   
  ){}



    private isSuperAdmin(user: any): boolean {
    return user.role !== 'client';
  }
  // Helper pour vérifier si l'utilisateur est TOPMANAGER de la structure du membre cible
  private async isUserTopManagerForMember(actingUserId: string, targetMemberId: string): Promise<boolean> {
    const targetMember = await this.membreStructRepository.findOne({
      where: { iduser: targetMemberId },
      relations: ['structure'],
      withDeleted:true
    });
    if (!targetMember || !targetMember.structure) return false;

    const actingUserAsMember = await this.membreStructRepository.findOne({
      where: {
        iduser: actingUserId,
        structure: { idStruct: targetMember.structure.idStruct },
        roleMembre: roleMembreEnum.TOPMANAGER,
      },
    });
    return !!actingUserAsMember;
  }

  // Helper pour vérifier si l'utilisateur est le supérieur direct du membre cible
  private async isUserDirectSuperieur(actingUserId: string, targetMemberId: string): Promise<boolean> {
    const targetMember = await this.membreStructRepository.findOne({
      where: { iduser: targetMemberId },
      relations: ['superieur'],
      withDeleted:true
    });
    return !!(targetMember && targetMember.superieur && targetMember.superieur.iduser === actingUserId);
  }



  async createStructure(createStructure: CreateStructureDto) {


    try{
      return await this.structureRepo.save(createStructure)
     }
    catch(err){
     throw new HttpException(err.message,804)
    }

   }
   async getStructureByname(nomStruct:string){
    try{
      return await this.structureRepo.findOne({
        where:{nomStruct}
      })
    }
    catch(err){
      throw err
    }
   }


   async findAllStruct(){
    try{
    return await this.structureRepo.find()
      
    }
    catch(err){
      throw err
    }
   }

   async getTotalStructures() {
    try {
        const total = await this.structureRepo.count();
        return { total };
    } catch (err) {
        throw err;
    }
}


   async findAllstructurename(){
    try{
      const resultat= await this.structureRepo.createQueryBuilder('structure')
      .select("structure.nomStruct","nomstructure")
      .getRawMany();

      return  resultat.map(row => row.nomstructure);
    }
    catch(err){

    }
   }

 

   async mapStructureWithmembers(){
    try{
      const structures = await this.structureRepo.find({
        relations: ["membres"]
      })

      return structures
    }
    catch(err){
      throw new HttpException(err.message,805)
    }
   }


   //adhesion

      //validation
     async validationadhesion(idStruct: string, user) {
  try {
    checkAdminAccess(user);
    const structure = await this.structureRepo.findOne({ where: { idStruct } });
    if (!structure) {
      throw new HttpException('Structure not found', 802);
    }

    structure.adhesion = true;
    await this.structureRepo.save(structure);

    return structure;
  } catch (err) {
    throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}




      //decliner
  async refuserAdhesion(idStruct: string, user) {
  try {
      checkAdminAccess(user);

    const structure = await this.structureRepo.findOne({ where: { idStruct } });

    if (!structure) {
      throw new HttpException('Structure not found', HttpStatus.NOT_FOUND);
    }

    structure.adhesion = false;
    await this.structureRepo.save(structure);

    await this.structureRepo.softDelete({ idStruct });

    return { message: 'Adhesion refusée et structure supprimée' };
  } catch (err) {
    throw new HttpException(err.message, 804);
  }
}

          //restore une structure
  async RestoreAdhesion(idStruct: string, user) {
  try {
    checkAdminAccess(user);

    await this.structureRepo.restore({ idStruct });
    return { message: 'structure restaurée' };
  } catch (err) {
    throw new HttpException(err.message, 804);
  }
}




     //liste des approuvées
     async getStructuctreadh(user){
      try{
      let structures=[];
      // if(user.role==="client"){
      //   throw new HttpException("pas autorisé à voir",HttpStatus.FORBIDDEN)
      // }
      structures = await this.structureRepo.createQueryBuilder("structure")
      .select()
      .where("structure.adhesion=:adhesion",{adhesion:true})
      .getMany()

      return structures}

      catch(err){
        return new HttpException(err.message,804)
      }
    }


     //liste des non approuvées
     async getStructuctreNadh(user) {
  try {
    // if (user.role === "client") {
    //   throw new HttpException("pas autorisé à voir", HttpStatus.FORBIDDEN);
    // }

    const structures = await this.structureRepo.createQueryBuilder("structure")
      .select()
      .where("structure.adhesion = :adhesion", { adhesion: false })
      .getMany();

    return structures;
  } catch (err) {
    return new HttpException(err.message, 805);
  }
}


    async getStructuctreRefuse(user) {
  try {
    // if (user.role === "client") {
    //   throw new HttpException("pas autorisé à voir", HttpStatus.FORBIDDEN);
    // }

    const structures = await this.structureRepo.createQueryBuilder("structure")
      .select()
      .withDeleted()
      .where("structure.deletedAt IS NOT NULL")
      .getRawMany();

    return structures;
  } catch (err) {
    return new HttpException(err.message, 805);
  }
}




    async getOrganigrammeData(idStruct: string): Promise<OrgChartNodeDto[]> {
      const structureExists = await this.structureRepo.count({ where: { idStruct } });
      if (!structureExists) {
          throw new NotFoundException(`Structure avec l'ID ${idStruct} non trouvée.`);
      }

      const membres = await this.membreStructRepository.find({
          where: { structure: { idStruct: idStruct } },
          relations: ['superieur'], // Charger l'entité 'superieur'
      });

      if (!membres || membres.length === 0) {
          return []; // Pas de membres, retourne un tableau vide
      }

      const organigrammeNodes: OrgChartNodeDto[] = membres.map(membre => {
          const nomComplet = `${membre.name || ''} ${membre.firstname || ''}`.trim();

          return {
              id: membre.iduser,
              superieur: membre.superieur ? membre.superieur.iduser : null,
              nom_prenom: nomComplet || '',
              roleMembre: membre.roleMembre,
              email: membre.email || '',
          };
      });

      return organigrammeNodes;
  }




  async countStructuresEnAttente(): Promise<number> {
    try {
      return this.structureRepo.count({ where: { adhesion: false, deletedAt: IsNull() } });
    } catch (err) {
      throw new HttpException('Erreur lors du comptage des structures en attente.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async countStructuresApprouvees(): Promise<number> {
    try {
      // Si une structure approuvée ne peut pas être soft-deleted, deletedAt: IsNull() n'est pas nécessaire.
      // Sinon, ajoutez-le pour la cohérence.
      return this.structureRepo.count({ where: { adhesion: true /*, deletedAt: IsNull() */ } });
    } catch (err) {
      throw new HttpException('Erreur lors du comptage des structures approuvées.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getOneStructure(idStruct: string): Promise<Structure | null> {
    try {
      return this.structureRepo.findOne({ where: { idStruct } });
    } catch (err) {
      throw new HttpException(`Erreur lors de la récupération de la structure ${idStruct}.`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }




  async findAllStructsConditional(user: any /* UserEntity ou type spécifique si vous avez */): Promise<Structure[]> {
    try {
      // Utilisez la valeur de l'enum si vous en avez une, sinon la chaîne littérale.
      // Exemple avec chaîne littérale comme demandé:
      if (user.role === "client") {
        if (!user.nomStruct) {
          // Il est crucial que nomStruct soit présent pour un client.
          // Vous pourriez lancer une erreur BadRequest si ce n'est pas le cas.
          console.warn("findAllStructsConditional: Rôle client mais nomStruct manquant sur l'objet user.");
          throw new BadRequestException("Informations utilisateur client incomplètes (nomStruct manquant).");
          // Ou retourner un tableau vide si c'est le comportement préféré :
          // return [];
        }

        // Recherche la structure spécifique du client
        const clientStructure = await this.structureRepo.findOne({
          where: { nomStruct: user.nomStruct },
        });

        if (!clientStructure) {
          return [];
        }
        return [clientStructure];

      } else {
        return await this.structureRepo.find();
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      // Pour les autres erreurs (ex: erreur de base de données)
      console.error("Erreur lors de la récupération des structures (findAllStructsConditional):", err.message);
      throw new HttpException(err.message, 500);
    }
  }



  async getMembresByStructureId(idStruct: string): Promise<MembreStruct[]> {
  const structure = await this.structureRepo.findOne({
    where: { idStruct },
    relations: ['membres'],
  });

  if (!structure) {
    throw new NotFoundException('Structure non trouvée');
  }

  return structure.membres;
}



//##############_________validation membre________________________####################


async validerAdhesionMembre(idMembre: string, user: any) {
    const membreCible = await this.membreStructRepository.findOne({
      where: { iduser: idMembre },
      relations: ['structure', 'superieur'], // Charger structure et superieur pour les vérifications
    });

    if (!membreCible) {
      throw new NotFoundException(`Membre avec l'ID ${idMembre} non trouvé.`);
    }
    if (!membreCible.structure) {
        throw new BadRequestException(`Le membre avec l'ID ${idMembre} n'est pas associé à une structure.`);
    }

    const canValidate =
      this.isSuperAdmin(user) ||
      (await this.isUserTopManagerForMember(user.iduser, idMembre)) ||
      (await this.isUserDirectSuperieur(user.iduser, idMembre));

    if (!canValidate) {
      throw new ForbiddenException("Action non autorisée. Vous n'avez pas les droits pour valider ce membre.");
    }

    membreCible.adhesion = true;
    try {
      await this.membreStructRepository.save(membreCible);
      return membreCible;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async refuserAdhesionMembre(idMembreCible: string, userQuiAgit: any) {
    // Empêcher l'auto-refus
    if (idMembreCible === userQuiAgit.iduser) {
      throw new ForbiddenException("Vous не pouvez pas refuser votre propre adhésion de cette manière.");
    }

    const membreCible = await this.membreStructRepository.findOne({
      where: { iduser: idMembreCible },
      relations: ['structure', 'superieur'], // Charger les relations pour les vérifications de droits
    });

    if (!membreCible) {
      throw new NotFoundException(`Membre avec l'ID ${idMembreCible} non trouvé.`);
    }
    if (!membreCible.structure) {
        throw new BadRequestException(`Le membre avec l'ID ${idMembreCible} n'est pas associé à une structure.`);
    }
    if (membreCible.deletedAt) {
        throw new BadRequestException(`Le membre avec l'ID ${idMembreCible} est déjà supprimé.`);
    }


    const canRefuse =
      this.isSuperAdmin(userQuiAgit) ||
      (await this.isUserTopManagerForMember(userQuiAgit.iduser, idMembreCible)) ||
      (await this.isUserDirectSuperieur(userQuiAgit.iduser, idMembreCible));

    if (!canRefuse) {
      throw new ForbiddenException("Action non autorisée. Vous n'avez pas les droits pour refuser l'adhésion de ce membre.");
    }

    membreCible.adhesion = false;
    try {
      await this.membreStructRepository.save(membreCible); // Sauvegarder adhesion = false
      await this.membreStructRepository.softDelete({ iduser: idMembreCible }); // Puis soft-delete
      return { message: 'Adhésion du membre refusée et membre marqué comme supprimé.' };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async restaurerMembre(idMembreCible: string, userQuiAgit: any) {
    const membreCible = await this.membreStructRepository.findOne({
        where: { iduser: idMembreCible },
        relations: ['structure', 'superieur'], // Charger les relations pour les vérifications de droits
        withDeleted: true, // pour trouver un membre soft-deleted
      
    });

    if (!membreCible) {
        throw new NotFoundException(`Membre avec l'ID ${idMembreCible} non trouvé, même parmi les supprimés.`);
    }

    if (!membreCible.deletedAt) {
        throw new BadRequestException(`Le membre avec l'ID ${idMembreCible} n'est pas supprimé et ne peut être restauré.`);
    }
     if (!membreCible.structure) { // Devrait toujours être là, mais bonne pratique de vérifier
        throw new BadRequestException(`Le membre avec l'ID ${idMembreCible} n'est pas associé à une structure.`);
    }


 
     const canRestore =
      this.isSuperAdmin(userQuiAgit) ||
      (await this.isUserTopManagerForMember(userQuiAgit.iduser, idMembreCible)) ||
      (await this.isUserDirectSuperieur(userQuiAgit.iduser, idMembreCible));
      ; // Supérieur direct


    if (!canRestore) {
      throw new ForbiddenException("Action non autorisée. Vous n'avez pas les droits pour restaurer ce membre.");
    }

    try {
      await this.membreStructRepository.restore({ iduser: idMembreCible });
       const membreRestaure = await this.membreStructRepository.findOne({ where: { iduser: idMembreCible } });
      if (membreRestaure) {
        membreRestaure.adhesion = false; // Remettre en attente
        await this.membreStructRepository.save(membreRestaure);
      }
      return { message: `Membre avec l'ID ${idMembreCible} restauré avec succès.` };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getMembresEnAttenteAdhesion(idStruct: string, user: any): Promise<MembreStruct[]> {
    const structure = await this.structureRepo.findOne({ where: { idStruct } });
    if (!structure) {
      throw new NotFoundException(`Structure avec l'ID ${idStruct} non trouvée.`);
    }

 
    // SuperAdmin ou TOPMANAGER de cette structure. Un supérieur pourrait voir ses subordonnés directs en attente.
    const isActingUserTopManager = await this.membreStructRepository.findOne({
        where: { iduser: user.iduser, structure: { idStruct }, roleMembre: roleMembreEnum.TOPMANAGER }
    });

    if (!this.isSuperAdmin(user) && !isActingUserTopManager) {
        throw new ForbiddenException("Action non autorisée pour voir les membres en attente de cette structure.");
    }

    try {
      return await this.membreStructRepository.find({
        where: {
          structure: { idStruct: idStruct },
          adhesion: false,
        },
      });
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
  async getMembresApprouvesDansStructure(idStruct: string, user: any): Promise<MembreStruct[]> {
    const structure = await this.structureRepo.findOne({ where: { idStruct } });
    if (!structure) {
      throw new NotFoundException(`Structure avec l'ID ${idStruct} non trouvée.`);
    }
     const isActingUserTopManager = await this.membreStructRepository.findOne({
        where: { iduser: user.iduser, structure: { idStruct }, roleMembre: roleMembreEnum.TOPMANAGER }
    });

    if (!this.isSuperAdmin(user) && !isActingUserTopManager) { // Ou autre logique d'accès
        throw new ForbiddenException("Action non autorisée pour voir les membres approuvés de cette structure.");
    }
    
    try {
      return await this.membreStructRepository.find({
        where: {
          structure: { idStruct: idStruct },
          adhesion: true,
        },
      });
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }




  async getMembresRefusesOuSupprimesDansStructure(idStruct: string, user: any): Promise<MembreStruct[]> {
    const structure = await this.structureRepo.findOne({ where: { idStruct } });
    if (!structure) {
      throw new NotFoundException(`Structure avec l'ID ${idStruct} non trouvée.`);
    }

    const isActingUserTopManager = await this.membreStructRepository.findOne({
        where: { iduser: user.iduser, structure: { idStruct }, roleMembre: roleMembreEnum.TOPMANAGER }
    });

    if (!this.isSuperAdmin(user) && !isActingUserTopManager) {
        throw new ForbiddenException("Action non autorisée pour voir les membres refusés de cette structure.");
    }

    try {
        // Membres soft-deleted (deletedAt IS NOT NULL)
        // L'adhésion sera false car on l'a mise à false avant le softDelete.
        return await this.membreStructRepository.find({
            where: {
                structure: { idStruct: idStruct },
                deletedAt: Not(IsNull()) // On ne veut que les soft-deleted
            },
            withDeleted: true, // Nécessaire pour que TypeORM récupère les entités soft-deleted
        });
    } catch (err) {
        throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }





//   async softDeleteStructure(idStructs: string[], user: any /* Optionnel: pour vérification des droits */) {
//     if (!this.isSuperAdmin(user)) { // Ou une autre logique de permission
//       throw new ForbiddenException("Action non autorisée pour supprimer cette structure.");
//     }

//     // const structure = await this.structureRepo.findOne({ where: { idStructs } });
//     // const structures = await this.structureRepo.find( {where:{id in idstructus}});
//     // console.log(structures)
//     if (!idStructs||idStructs.length==0) {
//       throw new NotFoundException(HttpStatus.BAD_REQUEST);
//     }
//     try {
//       const softDeleteResult = await this.structureRepo.softDelete(idStructs);

//       if (softDeleteResult.affected !== idStructs.length) {
//         throw new NotFoundException(`une structure dans les Id non trouvées`);
//       }
//       return { message: `Structure avec l'ID ${idStructs} marquée comme supprimée avec succès.` };
//     } catch (err) {
//       if (err instanceof HttpException) throw err;
//       throw new HttpException(`Erreur lors du soft delete de la structure ${idStructs}.`, HttpStatus.BAD_REQUEST);
//     }
// }


async softDeleteStructure(idStructs: string[], user: any) {
  if (!this.isSuperAdmin(user)) {
    throw new ForbiddenException("Action non autorisée pour supprimer cette structure.");
  }

  if (!idStructs || idStructs.length === 0) {
    throw new HttpException('Aucun id passé en paramètre', HttpStatus.BAD_REQUEST);
  }

  try {
    const notFoundIds: string[] = [];
    let nbdelete = 0;

    for (const id of idStructs) {
      const structure = await this.structureRepo.findOne({ where: { idStruct: id } });

      if (!structure) {
        notFoundIds.push(id);
        continue;
      }

      await this.structureRepo.softDelete(id);
      nbdelete++;
    }

    if (notFoundIds.length > 0) {
      throw new HttpException(
        `Les structures suivantes sont introuvables : ${notFoundIds.join(', ')}`,
        HttpStatus.BAD_REQUEST
      );
    }

    return {
      message: "Structures supprimées avec succès.",
      deletedCount: nbdelete,
    };

  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException(`Erreur lors du soft delete des structures.`, HttpStatus.BAD_REQUEST);
  }
}


}
