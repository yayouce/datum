import { Injectable } from '@nestjs/common';
import { CreateEnqueteDto } from './dto/create-enquete.dto';
import { UpdateEnqueteDto } from './dto/update-enquete.dto';

@Injectable()
export class EnqueteService {
  create(createEnqueteDto: CreateEnqueteDto) {
    return 'This action adds a new enquete';
  }

  findAll() {
    return `This action returns all enquete`;
  }

  findOne(id: number) {
    return `This action returns a #${id} enquete`;
  }

  update(id: number, updateEnqueteDto: UpdateEnqueteDto) {
    return `This action updates a #${id} enquete`;
  }

  remove(id: number) {
    return `This action removes a #${id} enquete`;
  }
}
