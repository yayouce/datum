import { HttpException, Injectable } from '@nestjs/common';
import { CreateDataTypeDto } from './dto/create-data_type.dto';
import { UpdateDataTypeDto } from './dto/update-data_type.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataType } from './entities/data_type.entity';
import { Repository } from 'typeorm';

@Injectable()
export class DataTypeService {
 constructor(
     @InjectRepository(DataType)
     private datatyepeRepo : Repository<DataType>,
  
 ){}
   
 
 async creationdatatyepe(creation:CreateDataTypeDto){
   try{
     
     return await this.datatyepeRepo.save(creation)
   }
   catch(err){
     throw new HttpException(err.message,800)
   }
 }
   
 async getAlldatatype(){
   try{
     return await this.datatyepeRepo.find()
   }
   catch(err){
     throw new HttpException(err.message,801)
   }
 }
 
 
 async getone(iddatatype){
 try{
   return await this.datatyepeRepo.findOneBy({iddatatype})
 }
 catch(err){
   throw new HttpException(err.message,802)
 }
 }


 async getoneByLibelle(libelledatatype){
  try{
    return await this.datatyepeRepo.findOneBy({libelledatatype})
  }
  catch(err){
    throw new HttpException(err.message,803)
  }
  }


}
