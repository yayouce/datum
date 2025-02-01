import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DataTypeService } from './data_type.service';
import { CreateDataTypeDto } from './dto/create-data_type.dto';

@Controller('data-type')
export class DataTypeController {
  constructor(private readonly dataTypeService: DataTypeService) {}

  @Post("add")
  create(@Body() createDataTypeDto: CreateDataTypeDto) {
    return this.dataTypeService.creationdatatyepe(createDataTypeDto);
  }

  @Get()
  findAll() {
    return this.dataTypeService.getAlldatatype();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dataTypeService.getone(id);
  }

 
}
