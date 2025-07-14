import { Controller, Get, Post, Body, Param, Patch, Delete, NotFoundException, BadRequestException, ParseUUIDPipe, HttpException, InternalServerErrorException, UseInterceptors, UploadedFile, UseGuards, Query } from "@nestjs/common";
import { GraphService } from "./graph.service";
import { CreateGraphDto } from "./dto/create-graph.dto";
import { UpdateGraphDto } from "./dto/update-graph.dto";
import { FeatureCollection, FeatureCollection as GeoJsonFeatureCollection } from 'geojson';
import { FileInterceptor } from "@nestjs/platform-express";
import { ImportMapFileDto } from "./dto/importMapFile.dto";
import { JwtAuthGuard } from "../Auth/jwt-auth.guard";
import { UserEntity } from "../user/entities/user.entity";
import { MembreStruct } from "../membre-struct/entities/membre-struct.entity";
import { User } from "../decorator/user.decorator";


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
  @Post("update/:id")
  async update(@Param("id") id: string, @Body() updateGraphDto: UpdateGraphDto) {
    return await this.graphService.update(id, updateGraphDto);
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

 

  @Post("delete/:id")
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


@Get('graphByprojectinStudio/:idprojet')
async getGraphTitlesByProjectinStudio(@Param('idprojet') idprojet: string) {
  return this.graphService.getGraphByProjectInStudio(idprojet);
}


@Get('graphbyNameAndProject/:name/:projectId')
async getGraphByNameAndProject(@Param('name') name: string, @Param('projectId') projectId: string) {
    return this.graphService.findByNameAndProject(name, projectId);
}


@Get('/count/:idprojet')
  async getTotalGraphs(@Param('idprojet') idprojet: string) {
    return { totalGraphs: await this.graphService.getTotalGraphsByProject(idprojet) };
  }



@Get('/data/geojson/:idgraphique') 
    async getgeojson(

        @Param('idgraphique', ParseUUIDPipe) idgraphique: string
    ): Promise<FeatureCollection> {

        try {
            // --- APPEL UNIQUE AU SERVICE QUI FAIT TOUT ---
            const geoJsonData = await this.graphService.generateGeoJsonForGraph(idgraphique);
            // Si tout va bien, retourne les données
            return geoJsonData;

        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new InternalServerErrorException(`Une erreur serveur inattendue est survenue lors de la récupération des données pour le graphique ${idgraphique}.`);
        }
    }




  //   @Post('import-map/:idsource')
  // @UseInterceptors(FileInterceptor('fichier'))
  // async importMapFile(
  //   @Param('idsource') idsource: string,
  //   @Body() importMapFileDto: ImportMapFileDto,
  //   @UploadedFile() file: Express.Multer.File,
  // ) {
  //   // File validation (extension) 
  //   const allowedExtensions = ['.geojson', '.json', '.kml', '.kmz', '.zip'];
  //   const fileExt = '.' + file.originalname.split('.').pop()?.toLowerCase();
  //   if (!allowedExtensions.includes(fileExt)) {
  //       throw new BadRequestException(`Type de fichier non supporté : ${fileExt}. Attendus : ${allowedExtensions.join(', ')}`);
  //   }
  //    if (fileExt === '.zip' && file.mimetype !== 'application/zip') {
  //      console.warn(`Fichier .zip avec mimetype ${file.mimetype} reçu. Attendu application/zip. Traitement tenté.`);
  //    }

  //   try {

  //     return await this.graphService.createMapFromFile(idsource, importMapFileDto, file); // <<< Pass idsource
  //   } catch (error) {
  //      console.error("Erreur contrôleur import-map:", error);
  //      if (error instanceof HttpException) {
  //          throw error;
  //      }
  //      throw new InternalServerErrorException("Erreur serveur lors de l'importation de la carte.");
  //   }
  // }



  @Post('import-map/:idsource')
@UseInterceptors(FileInterceptor('fichier'))
async importMapFile(
  @Param('idsource') idsource: string,
  @Body() importMapFileDto: ImportMapFileDto,
  @UploadedFile() file: Express.Multer.File,
  @Query('existingGraphId') existingGraphId?: string, // Paramètre de requête facultatif
) {
  // Validation de l'extension du fichier
  const allowedExtensions = ['.geojson', '.json', '.kml', '.kmz', '.zip'];
  const fileExt = '.' + file.originalname.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(fileExt)) {
    throw new BadRequestException(`Type de fichier non supporté : ${fileExt}. Attendus : ${allowedExtensions.join(', ')}`);
  }
  if (fileExt === '.zip' && file.mimetype !== 'application/zip') {
    console.warn(`Fichier .zip avec mimetype ${file.mimetype} reçu. Attendu application/zip. Traitement tenté.`);
  }

  try {
    return await this.graphService.createMapFromFile(idsource, importMapFileDto, file, existingGraphId); // Passer l'ID existant
  } catch (error) {
    console.error("Erreur contrôleur import-map:", error);
    if (error instanceof HttpException) {
      throw error;
    }
    throw new InternalServerErrorException("Erreur serveur lors de l'importation de la carte.");
  }
}



@Post('import-map2/:existantgraphId')
@UseInterceptors(FileInterceptor('fichier'))
async importMapFile2(
  @Param('existantgraphId') existantgraphId: string,
  @Body() importMapFileDto: ImportMapFileDto,
  @UploadedFile() file: Express.Multer.File,
) {
  // Validation de l'extension du fichier
  const allowedExtensions = ['.geojson', '.json', '.kml', '.kmz', '.zip'];
  const fileExt = '.' + file.originalname.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(fileExt)) {
    throw new BadRequestException(`Type de fichier non supporté : ${fileExt}. Attendus : ${allowedExtensions.join(', ')}`);
  }
  if (fileExt === '.zip' && file.mimetype !== 'application/zip') {
    console.warn(`Fichier .zip avec mimetype ${file.mimetype} reçu. Attendu application/zip. Traitement tenté.`);
  }

  try {
    return await this.graphService.createMapFromFile2(importMapFileDto,file,existantgraphId ); // Passer l'ID existant
  } catch (error) {
    console.error("Erreur contrôleur import-map:", error);
    if (error instanceof HttpException) {
      throw error;
    }
    throw new InternalServerErrorException("Erreur serveur lors de l'importation de la carte.");
  }
}




  @UseGuards(JwtAuthGuard) 
    @Post('deleteGraph') 
    async softDeleteStructure(
      @Body() body: {idGraph: string[]},
      @User() user: any, 
    ): Promise<{ message: string }> {
      const result = await this.graphService.deleteGraphs(body.idGraph, user);
      return { message: result.message };
    }
}
