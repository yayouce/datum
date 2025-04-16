import { Controller, Get, Post, Body, Param, Patch, Delete, NotFoundException, BadRequestException, ParseUUIDPipe, HttpException, InternalServerErrorException } from "@nestjs/common";
import { GraphService } from "./graph.service";
import { CreateGraphDto } from "./dto/create-graph.dto";
import { UpdateGraphDto } from "./dto/update-graph.dto";
import { FeatureCollection, FeatureCollection as GeoJsonFeatureCollection } from 'geojson';


@Controller("graph")
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  @Post("add/:idsource")
  create(
    @Body() createGraphDto: CreateGraphDto,
    @Param('idsource') idsource:string
  
  ) {
    return this.graphService.create2(createGraphDto,idsource);
  }

  @Post("add2/:idsource")
  create2(
    @Body() createGraphDto: CreateGraphDto,
    @Param('idsource') idsource:string
  
  ) {
    return this.graphService.create2(createGraphDto,idsource);
  }



  @Get("all")
  findAll() {
    return this.graphService.findAll();
  }

  @Get("getone/:id")
  findOne(@Param("id") id: string) {
    return this.graphService.findOne(id);
  }


  @Get("getOneById/:idgraph")
  async findOneGraphiqebyID(
    @Param("idgraph") idgraph: string){
    return this.graphService.findOneGraphiqebyID(idgraph)
  }

  //changer l'etat in studio ou outstudio (true ou false)
@Post("inOutstudio/:idgraph")
async addInOutstudio(
  @Param("idgraph") idgrpah:string
){

  return await this.graphService.InOutstudio(idgrpah)
}

  @Post("update/:id")
  async update(@Param("id") id: string, @Body() updateGraphDto: UpdateGraphDto) {
    return await this.graphService.update(id, updateGraphDto);
  }

  @Delete("delete/:id")
  remove(@Param("id") id: string) {
    return this.graphService.softDelete(id);
  }

  @Get('graphbysource/:idsource')
async getBySource(@Param('idsource') idsource: string) {
  return this.graphService.findBySource(idsource);
}

@Get('graphByproject/:idprojet')
async getGraphTitlesByProject(@Param('idprojet') idprojet: string) {
  return this.graphService.getGraphByProject(idprojet);
}

@Get('graphbyNameAndProject/:name/:projectId')
async getGraphByNameAndProject(@Param('name') name: string, @Param('projectId') projectId: string) {
    return this.graphService.findByNameAndProject(name, projectId);
}


@Get('/count/:idprojet')
  async getTotalGraphs(@Param('idprojet') idprojet: string) {
    return { totalGraphs: await this.graphService.getTotalGraphsByProject(idprojet) };
  }


  @Get('/data/geojson/:idgraphique') // Votre route spécifique
    async getgeojson(
        // Assurez-vous que le nom du paramètre ici ('idgraphique') correspond à celui dans la route
        @Param('idgraphique', ParseUUIDPipe) idgraphique: string
    ): Promise<FeatureCollection> {
        // this.logger.log(`Contrôleur : Requête GET pour /graphs/data/geojson/${idgraphique}`);

        try {
            // --- APPEL UNIQUE AU SERVICE QUI FAIT TOUT ---
            const geoJsonData = await this.graphService.generateGeoJsonForGraph(idgraphique);
            // Si tout va bien, retourne les données
            return geoJsonData;

        } catch (error) {
            // Log l'erreur telle qu'elle arrive au contrôleur
            // this.logger.error(`Erreur interceptée dans le contrôleur pour graph ${idgraphique}: ${error.message}`, error.stack);

            // Si l'erreur est déjà une HttpException (levée par GraphService),
            // la relancer telle quelle pour que NestJS envoie la bonne réponse HTTP (404, 400, etc.)
            if (error instanceof HttpException) {
                throw error;
            }

            // Pour toute autre erreur inattendue (ex: erreur DB non gérée dans le service)
            // envoyer une réponse 500 générique.
            throw new InternalServerErrorException(`Une erreur serveur inattendue est survenue lors de la récupération des données pour le graphique ${idgraphique}.`);
        }
    }

  

}
