import { HttpException, Injectable } from '@nestjs/common';
import { CreateFormatfichierDto } from './dto/create-formatfichier.dto';
import { Repository } from 'typeorm';
import { Formatfichier } from './entities/formatfichier.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class FormatfichierService {
constructor(
    @InjectRepository(Formatfichier)
    private formatRepo : Repository<Formatfichier>,
 
){}
  

async creationformat(creation:CreateFormatfichierDto){
  try{
    
    return await this.formatRepo.save(creation)
  }
  catch(err){
    throw new HttpException(err.message,800)
  }
}
  
async getAllFormat(){
  try{
    return await this.formatRepo.find()
  }
  catch(err){
    throw new HttpException(err.message,801)
  }
}



async getone(idformat){
try{
  return await this.formatRepo.findOneBy({idformat})
}
catch(err){
  throw new HttpException(err.message,802)
}
}




async getoneByLibelle(libelleFormat){
  try{
    return await this.formatRepo.findOneBy({libelleFormat})
  }
  catch(err){
    throw new HttpException(err.message,803)
  }
  }




  
}
