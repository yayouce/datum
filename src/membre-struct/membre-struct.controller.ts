import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MembreStructService } from './membre-struct.service';
import { CreateMembreStructDto } from './dto/create-membre-struct.dto';
import { UpdateMembreStructDto } from './dto/update-membre-struct.dto';
import { rejoindrestructureDto } from './dto/rejoindreStructure.dto';

@Controller('membrestruct')
export class MembreStructController {
  constructor(private readonly membreStructService: MembreStructService) {}

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

}
