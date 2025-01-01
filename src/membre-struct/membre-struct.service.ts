import { HttpException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MembreStruct } from './entities/membre-struct.entity';
import { Repository } from 'typeorm';

import { StructureService } from 'src/structure/structure.service';
import { CreateMembreStructDto } from './dto/create-membre-struct.dto';
import * as bcrypt from "bcrypt"
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

  
  
  const exist = await this.findOne(email)
  if(exist){
    throw new HttpException('utilisateur existe deja',705)
  }
  const membres = []
  const structureData = {nomStruct,descStruct,contactStruct,emailStruct,localisationStruc,membres}
 const creatredStructure= await this.structureservice.createStructure(structureData)
  
  const hashedpassword =await  bcrypt.hash(createmembre.password,saltOrRounds)
  const membreStruct=this.membreRepository.create({
    ...membredata,
    password:hashedpassword,
    email:createmembre.email,
    structure:creatredStructure
    
  })
  
  return this.membreRepository.save(membreStruct) 


}







async findOne(email){
  return await this.membreRepository.findOne({
   where: { email },
 })
 }

}
