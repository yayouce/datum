import { Controller, Get, InternalServerErrorException, NotFoundException, Param, ParseUUIDPipe, Patch, Post, UseGuards} from '@nestjs/common';
import { StructureService } from './structure.service';
import { OrgChartNodeDto } from './dto/organigramme.dto';
import { JwtAuthGuard } from '@/Auth/jwt-auth.guard';
import { User } from '@/decorator/user.decorator';


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

  @UseGuards(JwtAuthGuard)
  @Get("all")

  async findAllmembers(
       @User() user,
  ){
    try{
    return  await this.structureService.findAllStructsConditional(user)
    }
    catch(err){
      throw err
    }
  }

  @Get("getMembresByStructureId/:idstruct")
  async getMembresByStructureId(@Param("idsstruct") id:string){
      return await this.structureService.getMembresByStructureId(id)
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
   @UseGuards(JwtAuthGuard)
  @Post('adhesion/valider/:id')
  async validationAdhesion(@Param('id') idStruct: string,@User() user) {
    return await this.structureService.validationadhesion(idStruct,user);
  }

  // Refuser une adhésion
      @UseGuards(JwtAuthGuard)
  @Post('adhesion/refuser/:id')
  async refuserAdhesion(@Param('id') idStruct: string, @User() user) {
    return await this.structureService.refuserAdhesion(idStruct,user);
  }

  // Liste des structures approuvées
    @UseGuards(JwtAuthGuard)
  @Get('adhesion/approuvees')
  async getStructuctreadh(
       @User() user,
  ) {
    return await this.structureService.getStructuctreadh(user);
  }

  // Liste des structures non approuvées
  @UseGuards(JwtAuthGuard)
  @Get('adhesion/non-approuvees')
  async getStructuctreNadh(
    @User() user,
  ) {
    return await this.structureService.getStructuctreNadh(user);
  }
  

  //liste des structures refusées
  @UseGuards(JwtAuthGuard)
  @Get('adhesion/refuse')
  async getStructuctreRefuse(
       @User() user,
  ) {
    return await this.structureService.getStructuctreRefuse(user);
  }



    @UseGuards(JwtAuthGuard)
  @Post('adhesion/restore/:id')
  async RestoreAdhesion(@Param('id') idStruct: string,@User() user) {
    return await this.structureService.RestoreAdhesion(idStruct,user);
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
            throw error;
        }
        // Logguer l'erreur pour le débogage côté serveur
        console.error(`Erreur lors de la récupération de l'organigramme pour la structure ${idStruct}:`, error);
        // Pour toute autre erreur, renvoyer une erreur 500 générique
        throw new InternalServerErrorException("Une erreur interne est survenue lors de la récupération des données de l'organigramme.");
    }
}


}
