import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateEnqueteDto } from './dto/create-enquete.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Enquete } from './entities/enquete.entity';
import { Repository } from 'typeorm';
import { ProjetService } from 'src/projet/projet.service';
import { UpdateEnqueteDto } from './dto/update-enquete.dto';
import { UserEntity } from '@/user/entities/user.entity';
import { MembreStruct } from '@/membre-struct/entities/membre-struct.entity';
import { UserRole } from '@/generique/userroleEnum';

@Injectable()
export class EnqueteService {
  constructor(
      @InjectRepository(Enquete)
      private enqueteRepo:Repository<Enquete>,
      private projetservice: ProjetService
    ) {}


    // async getAll(user:any) {
    //   try {
    //     const enquete = await this.enqueteRepo.find({
    //       where: { membreStruct: { iduser: user.idStruct } },
    //     });
    //     return enquete;
    //   } catch (err) {
    //     throw err
    //   }
    // }



    async getAllByProject(idprojet:any) {
      try {
        const projet = await this.projetservice.getById(idprojet)
        if(!projet){
          throw new HttpException("projet n'existe pas",804)
        }
        const enquete = await this.enqueteRepo.find({
          where: { projet: { idprojet } },
        });
        return enquete;
      } catch (err) {
        throw err
      }
    }




    async Totalenqueteparprojet(idprojet:any) {
      try {
        const projet = await this.projetservice.getById(idprojet)
        if(!projet){
          throw new HttpException("projet n'existe pas",804)
        }
        const total = await this.enqueteRepo.count({
          where: { projet: { idprojet } },
        });
        return total;
      } catch (err) {
        throw err
      }
    }


    async getenqueteByID(idenquete){
      try {
        const enquete = await this.enqueteRepo.findOneBy({idenquete});
        return enquete;
      } catch (err) {
        throw new HttpException(err,807)
      }
    }

  async createEnquete(createenquete: CreateEnqueteDto,idProjet) {
      const { membreStruct, ...creation } = createenquete;
      try {
        // if (user?.roleMembre !== roleMembreEnum.TOPMANAGER) {
        //   throw new HttpException("pas autorisé à ajouter une  enquête",702);
        // }

        const theprojet = await this.projetservice.getById(idProjet)
     
         const newenquete = this.enqueteRepo.create({
          ...creation,
          // membreStruct: user,
          etatEnquete:"En_cours",
          nomStructure:theprojet.nomStructure,
          projet:theprojet
        });
        return await this.enqueteRepo.save(newenquete)
      } catch (err) {
        throw new HttpException(err.message,803)
      }
    }



    async updateEnquete(idEnquete: string, updateData: UpdateEnqueteDto) {
      try {
        // Vérifier si l'enquête existe
        const enquete = await this.enqueteRepo.findOneBy({ idenquete: idEnquete });
  
        if (!enquete) {
          throw new HttpException("L'enquête spécifiée n'existe pas.", 704);
        }
  
        // Mise à jour des champs avec les nouvelles valeurs
        const updatedEnquete = this.enqueteRepo.merge(enquete, updateData);
  
        // Sauvegarder les modifications
        return await this.enqueteRepo.save(updatedEnquete);
      } catch (err) {
        throw new HttpException(err.message, 500);
      }
    }




    async softDeleteEnquetes(idsEnquetes: string[],user:UserEntity|MembreStruct) {
      try {

        if(user.role==UserRole.Client){
                throw new HttpException("seul le superAdmin peut supprimer une enquête",HttpStatus.FORBIDDEN)
              }
        if (!idsEnquetes || idsEnquetes.length === 0) {
          throw new HttpException("Aucun ID fourni pour la suppression.", 700);
        }
    
        await this.enqueteRepo.softDelete(idsEnquetes);
    
        return {
          message: "Enquêtes supprimées avec succès.",
          deletedCount: idsEnquetes.length,
        };
      } catch (err) {
        throw new HttpException(err.message, 701);
      }


    }
    
    
}
