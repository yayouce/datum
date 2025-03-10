import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
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
      async validationadhesion(idStruct: string) {
        try {
          const structure = await this.structureRepo.findOne({ where: { idStruct } });
      
          if (!structure) {
            throw new HttpException('Structure not found', 802);
          }
          
      
          structure.adhesion = true;
          await this.structureRepo.save(structure); // Sauvegarde la modification
      
          return structure;
        } catch (err) {
          throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }


      //decliner
      async refuserAdhesion(idStruct: string) {
        try {
          const structure = await this.structureRepo.findOne({ where: { idStruct } });
      
          if (!structure) {
            throw new HttpException('Structure not found', HttpStatus.NOT_FOUND);
          }
      
          structure.adhesion = false;
          await this.structureRepo.save(structure); // Sauvegarde avant suppression
      
          await this.structureRepo.softDelete({ idStruct });
      
          return { message: 'Adhesion refusé et structure supprimée' };
        } catch (err) {
          throw new HttpException(err.message, 804);
        }
      }

     //liste des approuvées
     async getStructuctreadh(){
      
      try{
      const structure = await this.structureRepo.createQueryBuilder("structure")
      .select()
      .where("structure.adhesion=:adhesion",{adhesion:true})
      .getMany()

      return structure}


      catch(err){
        return new HttpException(err.message,804)
      }
    }


     //liste des non approuvées
     async getStructuctreNadh(){
      try{

        const structure = await this.structureRepo.createQueryBuilder("structure")
        .select()
        .where("structure.adhesion=:adhesion",{adhesion:false})
        .getMany()
  
        return structure
      }
      catch(err){
        return new HttpException(err.message,805)
      }
      
    }





   




 


}
