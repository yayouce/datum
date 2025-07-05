import { Controller, Get, Post, Body, Patch, Param, UseGuards, Delete } from '@nestjs/common';
import { ProjetService } from './projet.service';
import { CreateProjetDto } from './dto/create-projet.dto';
import { UpdateProjetDto } from './dto/update-projet.dto';
import { JwtAuthGuard } from 'src/Auth/jwt-auth.guard';
import { User } from 'src/decorator/user.decorator';
import { MembreStruct } from '../membre-struct/entities/membre-struct.entity';
import { UserEntity } from '../user/entities/user.entity';

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


  @UseGuards(JwtAuthGuard)
  @Get('getAll')
  async getAll(
    @User() user,
  ){
    return this.projetService.getAll(user)
  }


  @UseGuards(JwtAuthGuard)
  @Post('add')
  async creationProjet(
    @Body() data : CreateProjetDto,
    @User() user
  ){

    return await this.projetService.createProjet(data,user)

  }



  // @UseGuards(JwtAuthGuard)
  @Post('update/:id')
  async updateProjet(
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

  @UseGuards(JwtAuthGuard)
  @Post("deleteprojet")
  async deleteProjet(
    @Body() body: { idprojects: string[] },
    @User() user:UserEntity|MembreStruct
  ){
    return this.projetService.DeleteProjet(body.idprojects,user)
    
  }
}
