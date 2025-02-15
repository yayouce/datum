import { HttpException, Injectable} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MembreStruct } from './entities/membre-struct.entity';
import { Repository } from 'typeorm';

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
  const {nomStruct,descStruct,contactStruct,emailStruct,localisationStruc,password,email,structure,...membredata}=createmembre

  
  
  const exist = await this.findOnemembreByemail(email)
  if(exist){
    throw new HttpException('utilisateur existe deja',705)
  }
  const membres = []
  const structureData = {nomStruct,descStruct,contactStruct,emailStruct,localisationStruc,membres}
 const creatredStructure= await this.structureservice.createStructure(structureData)
  
  const hashedpassword =await  bcrypt.hash(createmembre.password,saltOrRounds)
  const membreStruct=await this.membreRepository.create({
    ...membredata,
    password:hashedpassword,
    roleMembre:roleMembreEnum.TOPMANAGER,
    email:createmembre.email,
    structure:creatredStructure,
    nomStruct:creatredStructure.nomStruct
    
  })
  
  return this.membreRepository.save(membreStruct) 


}


async rejoindreStructure(rejoindrestructures: rejoindrestructureDto) {
  try {
    const { emailSuperieur, password, ...data } = rejoindrestructures;

    // Recherche du supérieur par email
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
    });

    // Sauvegarde du nouveau membre
    await this.membreRepository.save(nouveauMembre);

    // Mise à jour du rôle du supérieur si nécessaire
    if (sup.roleMembre === roleMembreEnum.COORDINATEUR) {
      sup.roleMembre = roleMembreEnum.MANAGER;
      await this.membreRepository.save(sup); // Sauvegarde des modifications du supérieur
    }

    return nouveauMembre;
  } catch (err) {
    throw new HttpException(err.message, 900);
  }
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
      message: `voici lee code temporaéire ${code}`,
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




















}
