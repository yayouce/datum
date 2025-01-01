import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MembreStructService } from './membre-struct.service';
import { CreateMembreStructDto } from './dto/create-membre-struct.dto';
import { UpdateMembreStructDto } from './dto/update-membre-struct.dto';

@Controller('membrestruct')
export class MembreStructController {
  constructor(private readonly membreStructService: MembreStructService) {}

  @Post("register")
  async createMembreStruct(
    @Body() membreStructData :CreateMembreStructDto
  ){

    return await this.membreStructService.createMembreStruct(membreStructData)
  }

}
