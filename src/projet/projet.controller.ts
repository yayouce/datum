import { Controller, Get, Post, Body, Patch, Param, UseGuards, Delete } from '@nestjs/common';
import { ProjetService } from './projet.service';
import { CreateProjetDto } from './dto/create-projet.dto';
import { UpdateProjetDto } from './dto/update-projet.dto';
import { JwtAuthGuard } from 'src/Auth/jwt-auth.guard';
import { User } from 'src/decorator/user.decorator';

@Controller('projet')
export class ProjetController {
  constructor(private readonly projetService: ProjetService) {}

  // @UseGuards(JwtAuthGuard)
  // @Get('getMyAllProjects')
  // async getAllFor(
  //   @User() user,
  // ){

  //   return this.projetService.getMyAll(user)
  // }


  @Get('getAll')
  async getAll(
    @User() user,
  ){

    return this.projetService.getAll()
  }


  // @UseGuards(JwtAuthGuard)
  @Post('add')
  async creationProjet(
    @Body() data : CreateProjetDto,
    @User() user
  ){

    return await this.projetService.createProjet(data,user)

  }



  // @UseGuards(JwtAuthGuard)
  @Patch('update/:id')
  async updateMateriel(
    @User() user,
    @Param('id') id:string,
    @Body() projet:UpdateProjetDto
  ){

    return this.projetService.updateProjet(id,projet,user)
  }


  @Get("getone/:id")
  async getById(
    @Param('id') idprojet:string
  ){
    return this.projetService.getById(idprojet)
  }


  @Get('total-par-etat')
  async getTotalProjetsParEtat() {
    return await this.projetService.getTotalProjetsParEtat();
  }

  @Delete("deleteprojet/:idprojet")
  async deleteProjet(
    @Param('id') idprojet:string,
    // @User() user
  ){
    return this.projetService.softDeleteProjet(idprojet)
    
  }
}
