import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FormatfichierService } from './formatfichier.service';
import { CreateFormatfichierDto } from './dto/create-formatfichier.dto';


@Controller('formatfichier')
export class FormatfichierController {
  constructor(private readonly formatfichierService: FormatfichierService) {}

  @Post("add")
  create(@Body() createFormatfichierDto: CreateFormatfichierDto) {
    return this.formatfichierService.creationformat(createFormatfichierDto);
  }

  @Get()
  findAll() {
    return this.formatfichierService.getAllFormat();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.formatfichierService.getone(id);
  }

  
}
