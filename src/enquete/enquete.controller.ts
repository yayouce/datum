import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EnqueteService } from './enquete.service';
import { CreateEnqueteDto } from './dto/create-enquete.dto';
import { UpdateEnqueteDto } from './dto/update-enquete.dto';

@Controller('enquete')
export class EnqueteController {
  constructor(private readonly enqueteService: EnqueteService) {}

  @Post()
  create(@Body() createEnqueteDto: CreateEnqueteDto) {
    return this.enqueteService.create(createEnqueteDto);
  }

  @Get()
  findAll() {
    return this.enqueteService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.enqueteService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEnqueteDto: UpdateEnqueteDto) {
    return this.enqueteService.update(+id, updateEnqueteDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.enqueteService.remove(+id);
  }
}
