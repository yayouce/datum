import { HttpException, Injectable } from '@nestjs/common';
import { CreateStructureDto } from './dto/create-structure.dto';

import { InjectRepository } from '@nestjs/typeorm';
import { Structure } from './entities/structure.entity';
import { Repository } from 'typeorm';


@Injectable()
export class StructureService {
  constructor(
    @InjectRepository(Structure)
    private structureRepo:Repository<Structure>,
   
  ){}

  async createStructure(createStructure: CreateStructureDto) {


    try{
      return await this.structureRepo.save(createStructure)
     
     }
    catch(err){
     throw new HttpException("la structure existe dejà!",804)
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



   




 


}
