import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UnitefrequenceService } from './unitefrequence.service';
import { UnitefrequenceDto } from './dto/create-data_type.dto';
import { UpdateunitefrequenceDto } from './dto/update-data_type.dto';

@Controller('unitefrequence')
export class UnitefrequenceController {
  constructor(private readonly unitefrequence: UnitefrequenceService) {}

  @Post("add")
  create(@Body() unitefrequenceDto: UnitefrequenceDto) {
    return this.unitefrequence.creationdatatyepe(unitefrequenceDto);
  }

  @Get()
  findAll() {
    return this.unitefrequence.getAllunite();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.unitefrequence.getone(id);
  }

 
}
