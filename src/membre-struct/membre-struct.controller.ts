import { Controller, Post, Body, } from '@nestjs/common';
import { MembreStructService } from './membre-struct.service';
import { CreateMembreStructDto } from './dto/create-membre-struct.dto';
import { rejoindrestructureDto } from './dto/rejoindreStructure.dto';
import { ForgotmembrePassword } from './dto/forgotpassword.dto';
// import { MailService } from 'src/utils/mail.service';

@Controller('membrestruct')
export class MembreStructController {
  constructor(
    private readonly membreStructService: MembreStructService,
    // private readonly mailService: MailService
  ) {}

  @Post("register")
  async createMembreStruct(
    @Body() membreStructData :CreateMembreStructDto
  ){

    return await this.membreStructService.createMembreStruct(membreStructData)
  }

  @Post("rejoindre")
  async rejoindreStructure(
    @Body() data:rejoindrestructureDto
  ){
    return await this.membreStructService.rejoindreStructure(data)
  }


  @Post("forgotpassword")
  async forgotpassword(
    @Body() data : ForgotmembrePassword
  ){
    return await this.membreStructService.forgotpassword(data)
  }

}
