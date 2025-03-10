import { Controller, Get, Param, Patch, Post} from '@nestjs/common';
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



  // Valider une adhésion
  @Patch('adhesion/valider/:id')
  async validationAdhesion(@Param('id') idStruct: string) {
    return await this.structureService.validationadhesion(idStruct);
  }

  // Refuser une adhésion
  @Post('adhesion/refuser/:id')
  async refuserAdhesion(@Param('id') idStruct: string) {
    return await this.structureService.refuserAdhesion(idStruct);
  }

  // Liste des structures approuvées
  @Get('adhesion/approuvees')
  async getStructuctreadh() {
    return await this.structureService.getStructuctreadh();
  }

  // Liste des structures non approuvées
  @Get('adhesion/non-approuvees')
  async getStructuctreNadh() {
    return await this.structureService.getStructuctreNadh();
  }
  

  //liste des structures refusées
  @Get('adhesion/refuse')
  async getStructuctreRefuse() {
    return await this.structureService.getStructuctreRefuse();
  }

}
