import { Module } from '@nestjs/common';
import { StructureService } from './structure.service';
import { StructureController } from './structure.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Structure } from './entities/structure.entity';
import { MembreStruct } from '@/membre-struct/entities/membre-struct.entity';

@Module({
  imports:[TypeOrmModule.forFeature([Structure,MembreStruct])],
  controllers: [StructureController],
  providers: [StructureService],
  exports :  [StructureService]
})
export class StructureModule {}
