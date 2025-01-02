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
    private projetService:Repository<Projet>
  ) {}
    
  async createProjet(CreateProjetdto: CreateProjetDto, user) {
    const { membreStruct, ...creation } = CreateProjetdto;
    try {
      if (user?.roleMembre !== roleMembreEnum.TOPMANAGER) {
        throw new HttpException("pas autorisé à ajouter projet",702);
      }
      const newProjet = this.projetService.create({
        ...creation,
        membreStruct: user,
        nomStructure:user.nomStruct
      });
      return await this.projetService.save(newProjet)
    } catch (err) {
      throw new HttpException(err.message,803)
    }
  }
  
}
