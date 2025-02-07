import { Controller, Get, Param} from '@nestjs/common';
import { StructureService } from './structure.service';


@Controller('structure')
export class StructureController {
  constructor(private readonly structureService: StructureService) {}

  @Get("members")
  async mapStructureWithmembers(){
    try{
    return  await this.structureService.mapStructureWithmembers()
    }
    catch(err){
      throw err
    }
  }

  @Get("all")
  async findAllmembers(){
    try{
    return  await this.structureService.findAllStruct()
    }
    catch(err){
      throw err
    }
  }

  @Get('total')
  async getTotalStructures() {
      return await this.structureService.getTotalStructures();
  }


  @Get("find/name")
  async findAllstructurename(){
    return await this.structureService.findAllstructurename()
  }


  @Get("findByName/:nom")
  async findbyname(
    @Param("nom") nomstruct:string
  ){
    return await this.structureService.getStructureByname(nomstruct)
  }
  



}
