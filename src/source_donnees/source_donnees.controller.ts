import { Controller, Get, Post, Body, Patch, Param, Query, HttpException } from '@nestjs/common';
import { SourceDonneesService } from './source_donnees.service';
import { CreateSourceDonneeDto } from './dto/create-source_donnee.dto';
import { SourceDonnee } from './entities/source_donnee.entity';
import { addColumnDto } from './dto/addcolumn.dto';
import { modifyColumnDto } from './dto/modify.dto';
import { removeColumnDto } from './dto/removeclumn.dto';
import { ApplyFunctionDto } from './dto/ApplyFunctionDto.dto';
import { modifyCellDto } from './dto/modifyCell.dto';
import { UpdateSourceDonneeDto } from './dto/update-source_donnee.dto';
import { JoinSourcesDto } from './dto/jointure.dto';
import { ApplyfunctionDto2 } from './dto/Applyfunction.dto';


@Controller('source-donnees')
export class SourceDonneesController {
  constructor(private readonly sourceDonneesService: SourceDonneesService) {}




  @Post('add/:idenquete')
  async creation(
    @Body() data : CreateSourceDonneeDto,
    @Param('idenquete') idenquete : string,
    // @UploadedFile() fichier: Express.Multer.File,
  ){
    return await this.sourceDonneesService.CreationSourcededonnees(data,idenquete)
  }



  @Patch("update/:idSource")
  async updateSourceDonnees(
    @Param('id') idsourceDonnes: string,
    @Body() updateSourceDonneeDto: UpdateSourceDonneeDto
) {
    try {
        const updatedSource = await this.sourceDonneesService.updateSourceDonnees(
            idsourceDonnes,
            updateSourceDonneeDto
        );
        return {
            message: "Source de données mise à jour avec succès",
            data: updatedSource,
        };
    } catch (error) {
        throw new HttpException(error.message, 800);
    }
  }


  // @Post('/join-create/:idprojet')
  // async joinAndCreateSource(
  //   @Param('idprojet') idprojet: string, // ✅ Récupération depuis l'URL
  //   @Body() joinData: JoinSourcesDto
  // ) {
  //   return this.sourceDonneesService.joinSources(idprojet, joinData);
  // }

  @Post('/jointure/:idprojet')
  async joinAndCreateSource2(
    @Param('idprojet') idprojet: string, // ✅ Récupération depuis l'URL
    @Body() joinData: JoinSourcesDto
  ) {
    return this.sourceDonneesService.joinSources2(idprojet, joinData);
  }



  @Get("getAll")
  async getAll()
  {
    return this.sourceDonneesService.getAllsource()
  }




  @Get('getbdsbyjointure/:idSourceJointe')
  async getBdsByJointureOne(@Param('idSourceJointe') idSourceJointe: string) {
    return this.sourceDonneesService.getBdsByJointureOne(idSourceJointe);
  }

  //data studio

  @Get('enquete/:idenquete')
  async getSourcesByEnquete(@Param('idenquete') idenquete: string): Promise<SourceDonnee[]> {
    return this.sourceDonneesService.getSourcesByEnquete(idenquete);
  }

  @Get('projet/:idprojet')
  async getSourcesByProjet(@Param('idprojet') idprojet: string): Promise<SourceDonnee[]> {
    return this.sourceDonneesService.getSourcesByProjet(idprojet);
  }

  //est dans studio ou pas true or false
  @Post("InOutStudio/:idSource")
  async InOutstudio(@Param("idSource") idSource:string){
    return this.sourceDonneesService.InOutstudio(idSource)
  }

  


  @Get('getbdbyprojet/:idprojet')
    async getBdsByProjet(
      @Param('idprojet') idprojet: string,
      @Query('bd') bdType: 'normales' | 'jointes' | 'tous'
    ): Promise<any[]> {
      return await this.sourceDonneesService.getBdsByProjetWithFilter(idprojet, bdType || 'tous');
    }

    
  
  @Get('getbdbyprojetInstudio/:idprojet')
  async getBdsByProjetWithFilterInStudio(
    @Param('idprojet') idprojet: string
  )
  {
    return await this.sourceDonneesService.getBdsByProjetWithFilterInStudio(idprojet)

  }


@Get('TotalBdsByprojet/:idprojet')
async getBdsCountByProjet(
  @Param('idprojet') idprojet: string
): Promise<{ normales: number; jointes: number; total: number }> {
  return await this.sourceDonneesService.getBdsCountByProjet(idprojet);
} 



@Get('getone/:idsource')
  async  geto(
    @Param('idsource') idsource:string
  ){
    return this.sourceDonneesService.getSourceById(idsource)
  }




  //ajout de colonne 
  @Post('add-column/:idsource')
  async addColumn(
    @Body() body: addColumnDto,
  @Param('idsource') idsource:string
  ) {
   
    return await this.sourceDonneesService.addColumn(idsource,body);
  }



  // modifier colonne

  @Patch('modify_column/:idsource')
  async modifyColumn(
    @Body() body: modifyColumnDto,
    @Param('idsource') idsource:string
  
  ) {
 

    // Appel du service pour modifier une colonne
    return await this.sourceDonneesService.modifyColumn(
      idsource,
      body
    );
  }



  @Patch('modifycell/:idsourceDonnes')
async modifyCell(
  @Param('idsourceDonnes') idsourceDonnes: string,
  @Body() modifyCellDto: modifyCellDto
) {
  return this.sourceDonneesService.modifyCell(idsourceDonnes, modifyCellDto);
}



  //suppression

  @Post('remove-column/:idsource')
  async removeColumn(
    @Body() body: removeColumnDto,
    @Param('idsource') idsource:string
  
  ) {

    // Appel du service pour supprimer une colonne
    return await this.sourceDonneesService.removeColumn(
      idsource,
      body
    );
  }




  @Post('apply-function/:idsource')
  async applyFunction(
    @Body() applyFunctionDto: ApplyFunctionDto,
    @Param('idsource') idsource:string
  ) {
    return await this.sourceDonneesService.applyFunctionAndSave(idsource,applyFunctionDto);
  }

  @Post('apply-function2/:idsource')
  async applyFunction2(
    @Body() applyFunctionDto: ApplyfunctionDto2,
    @Param('idsource') idsource:string
  ) {
    return await this.sourceDonneesService.applyFunctionAndSave2(idsource,applyFunctionDto);
  }



}
