import { HttpException, Injectable } from '@nestjs/common';
import { CreateEnqueteDto } from './dto/create-enquete.dto';
import { UpdateEnqueteDto } from './dto/update-enquete.dto';
import { roleMembreEnum } from 'src/generique/rolemembre.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Enquete } from './entities/enquete.entity';
import { Repository } from 'typeorm';
import { ProjetService } from 'src/projet/projet.service';

@Injectable()
export class EnqueteService {
  constructor(
      @InjectRepository(Enquete)
      private enqueteRepo:Repository<Enquete>,
      private projetservice: ProjetService
    ) {}


    async getAll(user:any) {
      try {
        const enquete = await this.enqueteRepo.find({
          where: { membreStruct: { iduser: user.idStruct } },
        });
        return enquete;
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

  async createEnquete(createenquete: CreateEnqueteDto, user,idProjet) {
      const { membreStruct, ...creation } = createenquete;
      try {
        // if (user?.roleMembre !== roleMembreEnum.TOPMANAGER) {
        //   throw new HttpException("pas autorisé à ajouter une  enquête",702);
        // }

        const theprojet = await this.projetservice.getById(idProjet)
     
         const newenquete = this.enqueteRepo.create({
          ...creation,
          membreStruct: user,
          nomStructure:user.nomStruct,
          projet:theprojet
        });
        return await this.enqueteRepo.save(newenquete)
      } catch (err) {
        throw new HttpException(err.message,803)
      }
    }
}
