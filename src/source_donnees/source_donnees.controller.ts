import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SourceDonneesService } from './source_donnees.service';
import { CreateSourceDonneeDto } from './dto/create-source_donnee.dto';
import { UpdateSourceDonneeDto } from './dto/update-source_donnee.dto';

@Controller('source-donnees')
export class SourceDonneesController {
  constructor(private readonly sourceDonneesService: SourceDonneesService) {}

  @Post()
  create(@Body() createSourceDonneeDto: CreateSourceDonneeDto) {
    return this.sourceDonneesService.create(createSourceDonneeDto);
  }

  @Get()
  findAll() {
    return this.sourceDonneesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sourceDonneesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSourceDonneeDto: UpdateSourceDonneeDto) {
    return this.sourceDonneesService.update(+id, updateSourceDonneeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sourceDonneesService.remove(+id);
  }
}
