import { HttpException, HttpStatus, Injectable} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MembreStruct } from './entities/membre-struct.entity';
import { IsNull, Repository } from 'typeorm';

import { StructureService } from 'src/structure/structure.service';
import { CreateMembreStructDto } from './dto/create-membre-struct.dto';
import * as bcrypt from "bcrypt"
import { rejoindrestructureDto } from './dto/rejoindreStructure.dto';
import { roleMembreEnum } from 'src/generique/rolemembre.enum';
import { randomInt } from 'crypto';
import { ForgotmembrePassword } from './dto/forgotpassword.dto';

const saltOrRounds = 10
@Injectable()
export class MembreStructService {
  constructor(
    @InjectRepository(MembreStruct)
    private membreRepository : Repository<MembreStruct>,
    private structureservice :  StructureService

 
)
{}
async createMembreStruct(createmembre:CreateMembreStructDto){
  const {nomStruct,descStruct,contactStruct,emailStruct,adhesion,localisationStruc,password,email,structure,...membredata}=createmembre

  
  
  const exist = await this.findOnemembreByemail(email)
  if(exist){
    throw new HttpException('utilisateur existe deja',705)
  }
  const membres = []
  const structureData = {nomStruct,descStruct,contactStruct,adhesion,emailStruct,localisationStruc,membres,}
 const creatredStructure= await this.structureservice.createStructure(structureData)
  
  const hashedpassword =await  bcrypt.hash(createmembre.password,saltOrRounds)
  const membreStruct=await this.membreRepository.create({
    ...membredata,
    password:hashedpassword,
    roleMembre:roleMembreEnum.TOPMANAGER,
    adhesion:true,
    email:createmembre.email,
    structure:creatredStructure,
    nomStruct:creatredStructure.nomStruct
    
  })
  
  return this.membreRepository.save(membreStruct) 


}


async rejoindreStructure(rejoindrestructures: rejoindrestructureDto) {
  let roleMembre="";
  try {
    const { emailSuperieur, password, ...data } = rejoindrestructures;
    const sup = await this.findOnemembreByemail(emailSuperieur);
    if (!sup) {
      throw new HttpException('Supérieur non trouvé', 805);
    }

    // Hachage du mot de passe
    const hashedPassword = await bcrypt.hash(password, saltOrRounds);

    // Création du nouveau membre
    const nouveauMembre = this.membreRepository.create({
      ...data,
      roleMembre: roleMembreEnum.COORDINATEUR,
      password: hashedPassword,
      structure: sup.structure,
      superieur: sup,
      adhesion:false,
    });

    // Sauvegarde du nouveau membre
    await this.membreRepository.save(nouveauMembre);

    // Mise à jour du rôle du supérieur si nécessaire
    if (sup.roleMembre === roleMembreEnum.COORDINATEUR) {
      sup.roleMembre = roleMembreEnum.MANAGER;
      this.moficationinformationsup(sup.email,sup); 
    }
    return nouveauMembre;
  } catch (err) {
    throw new HttpException(err.message, 900);
  }
}



async getMembresByStructureId(idStruct: string): Promise<MembreStruct[]> {
  try {
    return await this.membreRepository.find({
      where: {
        structure: { idStruct: idStruct },
        adhesion: true, // On ne montre généralement que les membres approuvés
        deletedAt: IsNull(), // Et non supprimés
      },
      // relations: ['structure', 'superieur'] // Chargez les relations nécessaires pour l'affichage
    });
  } catch (err) {
    throw new HttpException(`Erreur lors de la récupération des membres pour la structure ${idStruct}.`, HttpStatus.INTERNAL_SERVER_ERROR);
  }}

async moficationinformationsup(emailSuperieur,supdata){
   await this.findOnemembreByemail(emailSuperieur);
 
  return await this.membreRepository.save(supdata)

}

async findOnemembreByemail(email){
  return await this.membreRepository.findOne({
   where: { email },
 })
 }


 async getAllMembres() {
  return await this.membreRepository.find();
}



 async forgotpassword(email: ForgotmembrePassword){
  try{

    const fundmembre = await this.membreRepository.findOne({where:email})
    if(!fundmembre){
      throw new HttpException("n'existe pas!",803)
    }
    //je genere un code à envoyer
    const code=randomInt(80000,90000).toString()
   
    const hashedcode = await bcrypt.hash(code,saltOrRounds)
    fundmembre.password=hashedcode
    console.log(`voici lee code temporaéire ${code}`)
    

    await this.membreRepository.save(fundmembre)
   

    return {
      message: `voici lee code temporaire ${code}`,
    };


  }
  catch(err){
    throw new HttpException(err.message,804)
  }

}


// async countAllMembres() {
//   return await this.membreRepository.count();
// }

async countByRole(roleMembre: string) {
  return await this.membreRepository.count({ where: { roleMembre } });
}





// --- Méthodes AJOUTÉES pour le Dashboard ---

  async countMembresEnAttenteAdhesionGlobal(): Promise<number> {
    try {
      return await this.membreRepository.count({
        where: {
          adhesion: false,
          deletedAt: IsNull(), // Compter uniquement les membres actifs
        },
      });
    } catch (err) {
      throw new HttpException('Erreur lors du comptage global des membres en attente.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async countMembresAdhesionValideeGlobal(): Promise<number> {
    try {
      return await this.membreRepository.count({
        where: {
          adhesion: true,
          deletedAt: IsNull(), // Compter uniquement les membres actifs
        },
      });
    } catch (err) {
      throw new HttpException('Erreur lors du comptage global des membres validés.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async countMembresByRoleGlobal(role: roleMembreEnum): Promise<number> {
    try {
      // Cette fonction compte les membres actifs (adhésion validée et non supprimés) pour un rôle donné.
      return await this.membreRepository.count({
        where: {
          roleMembre: role,
          adhesion: true,       // On ne compte que les membres actifs et approuvés pour les rôles
          deletedAt: IsNull(),
        },
      });
    } catch (err) {
      throw new HttpException(`Erreur lors du comptage global des membres pour le rôle ${role}.`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async countMembresInStructure(idStruct: string): Promise<number> {
    try {
      return await this.membreRepository.count({
        where: {
          structure: { idStruct: idStruct },
          adhesion: true,       // On compte généralement les membres actifs/approuvés d'une structure
          deletedAt: IsNull(),
        },
      });
    } catch (err) {
      throw new HttpException(`Erreur lors du comptage des membres pour la structure ${idStruct}.`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async countMembresInStructureByRole(idStruct: string, role: roleMembreEnum): Promise<number> {
    try {
      return await this.membreRepository.count({
        where: {
          structure: { idStruct: idStruct },
          roleMembre: role,
          adhesion: true,       // Membres actifs et approuvés du rôle dans la structure
          deletedAt: IsNull(),
        },
      });
    } catch (err) {
      throw new HttpException(`Erreur lors du comptage des membres pour la structure ${idStruct} et le rôle ${role}.`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async countMembresEnAttenteInStructure(idStruct: string): Promise<number> {
    try {
      return await this.membreRepository.count({
        where: {
          structure: { idStruct: idStruct },
          adhesion: false,
          deletedAt: IsNull(),
        },
      });
    } catch (err) {
      throw new HttpException(`Erreur lors du comptage des membres en attente pour la structure ${idStruct}.`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async countMembresValidesInStructure(idStruct: string): Promise<number> {
    try {
      return await this.membreRepository.count({
        where: {
          structure: { idStruct: idStruct },
          adhesion: true,
          deletedAt: IsNull(),
        },
      });
    } catch (err) {
      throw new HttpException(`Erreur lors du comptage des membres validés pour la structure ${idStruct}.`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

}
