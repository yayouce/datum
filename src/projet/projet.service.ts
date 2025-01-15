import { HttpException, Injectable } from '@nestjs/common';
import { CreateProjetDto } from './dto/create-projet.dto';
import { UpdateProjetDto } from './dto/update-projet.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Projet } from './entities/projet.entity';
import { Repository } from 'typeorm';
import { roleMembreEnum } from 'generique/rolemembre.enum';

@Injectable()
export class ProjetService {

  constructor(
    @InjectRepository(Projet)
    private projetRepo:Repository<Projet>
  ) {}



  async getAll(user:any) {
    try {
      const projet = await this.projetRepo.find({
        where: { membreStruct: { iduser: user.idStruct } },
      });
      return projet;
    } catch (err) {
      throw err
    }
  }

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
    const { membreStruct, ...creation } = CreateProjetdto;
    try {
      if (user?.roleMembre !== roleMembreEnum.TOPMANAGER) {
        throw new HttpException("pas autorisé à ajouter projet",702);
      }
      const newProjet = this.projetRepo.create({
        ...creation,
        membreStruct: user,
        nomStructure:user.nomStruct
      });
      return await this.projetRepo.save(newProjet)
    } catch (err) {
      throw new HttpException(err.message,803)
    }
  }

  async updateProjet(idprojet:string,updateProjet:UpdateProjetDto,user) {
    const { membreStruct, ...updatedData } = updateProjet;


    try{
      // if (user?.roleMembre !== roleMembreEnum.TOPMANAGER) {
      //   throw new HttpException("pas autorisé à modifier le materiel", 702);
      // }
     const projet = await this.projetRepo.findOne({ where: { idprojet } });
     if (!projet) {
       throw new HttpException("projet non trouvé", 705);
     }
     if(user.structure.nomStruct !== projet.nomStructure){
    throw new HttpException("ce projet ne vous appartient pas",803);
      }

      Object.assign(projet,{
      ...updatedData,
      membreStruct:user
     });
     return await this.projetRepo.save(projet);
    } catch (err) {
      throw err
    }
  }




  //liste des sources de données par projet 





}