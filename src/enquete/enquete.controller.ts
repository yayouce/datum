import { Controller, Get, Post, Body, Param,  UseGuards } from '@nestjs/common';
import { EnqueteService } from './enquete.service';
import { CreateEnqueteDto } from './dto/create-enquete.dto';
import { JwtAuthGuard } from 'src/Auth/jwt-auth.guard';
import { User } from 'src/decorator/user.decorator';

@Controller('enquete')
export class EnqueteController {
  constructor(private readonly enqueteService: EnqueteService) {}


  // @UseGuards(JwtAuthGuard)
  @Post('add/:idProjet')
  async creationProjet(
    @Body() data : CreateEnqueteDto,
    //@User() user,
    @Param('idProjet') idProjet:string,
  ){

    return await this.enqueteService.createEnquete(data,idProjet)

  }


  @Get('getone/:idenquete')
  async getenqueteByID(
    @Param('idenquete') idenquete:string
  ){
    return await this.enqueteService.getenqueteByID(idenquete)
  }

  @Get('totalenqueteByProject/:idprojet')
  async getTotalenqueteparprojet(
    @Param("idproject") idproject
  ){
    return { totalEnquetes: await this.enqueteService.Totalenqueteparprojet(idproject) };
  }


  // @UseGuards(JwtAuthGuard)
  // @Get('getAll')
  // async getAllFor(
  //   @User() user,
  // ){

  //   return this.enqueteService.getAll(user)
  // }


  @Get('enqueteByproject/:idproject')
  async getAllByProject(
    @Param("idproject") idproject
  ){

    return await this.enqueteService.getAllByProject(idproject)
  }





  
}
