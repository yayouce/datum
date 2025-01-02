import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AteliersService } from './ateliers.service';
import { CreateAtelierDto } from './dto/create-atelier.dto';
import { UpdateAtelierDto } from './dto/update-atelier.dto';

@Controller('ateliers')
export class AteliersController {
  constructor(private readonly ateliersService: AteliersService) {}

  @Post()
  create(@Body() createAtelierDto: CreateAtelierDto) {
    return this.ateliersService.create(createAtelierDto);
  }

  @Get()
  findAll() {
    return this.ateliersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ateliersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAtelierDto: UpdateAtelierDto) {
    return this.ateliersService.update(+id, updateAtelierDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ateliersService.remove(+id);
  }
}
