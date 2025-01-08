import { HttpException, Injectable } from '@nestjs/common';
import {  UnitefrequenceDto } from './dto/create-data_type.dto';
import { UpdateunitefrequenceDto } from './dto/update-data_type.dto';
import { InjectRepository } from '@nestjs/typeorm';
import {  unitefrequence } from './entities/unitefrequence.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UnitefrequenceService {
 constructor(
     @InjectRepository(unitefrequence)
     private datatyepeRepo : Repository<unitefrequence>,
  
 ){}
   
 
 async creationdatatyepe(creation:UnitefrequenceDto){
   try{
     
     return await this.datatyepeRepo.save(creation)
   }
   catch(err){
     throw new HttpException(err.message,803)
   }
 }
   
 async getAllunite(){
   try{
     return await this.datatyepeRepo.find()
   }
   catch(err){
     throw new HttpException(err.message,804)
   }
 }
 
 
 async getone(idunifie){
 try{
   return await this.datatyepeRepo.findOneBy({idunifie})
 }
 catch(err){
   throw new HttpException(err.message,805)
 }
 }



 async getoneBylibelle(libelleunitefrequence){
  try{
    return await this.datatyepeRepo.findOneBy({libelleunitefrequence})
  }
  catch(err){
    throw new HttpException(err.message,805)
  }
  }


}
