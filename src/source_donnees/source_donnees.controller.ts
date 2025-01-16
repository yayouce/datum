import { Controller, Get, Post, Body, Patch, Param, Delete, UploadedFile, ParseIntPipe, HttpException } from '@nestjs/common';
import { SourceDonneesService } from './source_donnees.service';
import { CreateSourceDonneeDto } from './dto/create-source_donnee.dto';
import { UpdateSourceDonneeDto } from './dto/update-source_donnee.dto';
import { SourceDonnee } from './entities/source_donnee.entity';
import { addColumnDto } from './dto/addcolumn.dto';
import { modifyColumnDto } from './dto/modify.dto';
import { removeColumnDto } from './dto/removeclumn.dto';
import { ApplyFunctionDto } from './dto/ApplyFunctionDto.dto';


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


  @Get("getAll")
  async getAll()
  {
    return this.sourceDonneesService.getAllsource()
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


  //suppression

  @Delete('remove-column/:idsource')
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


}
