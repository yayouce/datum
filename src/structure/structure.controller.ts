import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { StructureService } from './structure.service';
import { CreateStructureDto } from './dto/create-structure.dto';
import { UpdateStructureDto } from './dto/update-structure.dto';

@Controller('structure')
export class StructureController {
  constructor(private readonly structureService: StructureService) {}

  @Get("members")
  async mapStructureWithmembers(){
    try{
    return  await this.structureService.mapStructureWithmembers()
    }
    catch(err){
      throw err
    }
  }

  @Get("all")
  async findAllmembers(){
    try{
    return  await this.structureService.findAllStruct()
    }
    catch(err){
      throw err
    }
  }
  
}
