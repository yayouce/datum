import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ProjetService } from './projet.service';
import { CreateProjetDto } from './dto/create-projet.dto';
import { UpdateProjetDto } from './dto/update-projet.dto';
import { JwtAuthGuard } from 'src/Auth/jwt-auth.guard';
import { User } from 'src/decorator/user.decorator';

@Controller('projet')
export class ProjetController {
  constructor(private readonly projetService: ProjetService) {}

  


  @UseGuards(JwtAuthGuard)
  @Post('add')
  async creationProjet(
    @Body() data : CreateProjetDto,
    @User() user
  ){

    return await this.projetService.createProjet(data,user)

  }
}
