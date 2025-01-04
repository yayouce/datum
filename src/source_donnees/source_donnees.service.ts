import { Injectable } from '@nestjs/common';
import { CreateSourceDonneeDto } from './dto/create-source_donnee.dto';
import { UpdateSourceDonneeDto } from './dto/update-source_donnee.dto';

@Injectable()
export class SourceDonneesService {
  create(createSourceDonneeDto: CreateSourceDonneeDto) {
    return 'This action adds a new sourceDonnee';
  }

  findAll() {
    return `This action returns all sourceDonnees`;
  }

  findOne(id: number) {
    return `This action returns a #${id} sourceDonnee`;
  }

  update(id: number, updateSourceDonneeDto: UpdateSourceDonneeDto) {
    return `This action updates a #${id} sourceDonnee`;
  }

  remove(id: number) {
    return `This action removes a #${id} sourceDonnee`;
  }
}
