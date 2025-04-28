import { Controller, Get, InternalServerErrorException, NotFoundException, Param, ParseUUIDPipe, Patch, Post} from '@nestjs/common';
import { StructureService } from './structure.service';
import { OrgChartNodeDto } from './dto/organigramme.dto';


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
  @Post('adhesion/valider/:id')
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



  @Post('adhesion/restore/:id')
  async RestoreAdhesion(@Param('id') idStruct: string) {
    return await this.structureService.RestoreAdhesion(idStruct);
  }




  @Get('organigramme/:idStruct')
  async getOrganigramme(
    @Param('idStruct', ParseUUIDPipe) idStruct: string // Valide que idStruct est un UUID
): Promise<OrgChartNodeDto[]> {
    try {
        // Le service effectue la recherche et le formatage
        const data = await this.structureService.getOrganigrammeData(idStruct);
        return data;
    } catch (error) {
        // Gérer l'erreur si la structure n'est pas trouvée
        if (error instanceof NotFoundException) {
            // Re-lancer l'erreur pour que NestJS renvoie une réponse 404
            throw error;
        }
        // Logguer l'erreur pour le débogage côté serveur
        console.error(`Erreur lors de la récupération de l'organigramme pour la structure ${idStruct}:`, error);
        // Pour toute autre erreur, renvoyer une erreur 500 générique
        throw new InternalServerErrorException("Une erreur interne est survenue lors de la récupération des données de l'organigramme.");
    }
}


}
