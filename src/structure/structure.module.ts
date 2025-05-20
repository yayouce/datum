import { forwardRef, Module } from '@nestjs/common';
import { StructureService } from './structure.service';
import { StructureController } from './structure.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Structure } from './entities/structure.entity';
import { MembreStruct } from '@/membre-struct/entities/membre-struct.entity';
import { MembreStructModule } from '@/membre-struct/membre-struct.module';
import { ProjetModule } from '@/projet/projet.module';

@Module({
  imports:[TypeOrmModule.forFeature([Structure,MembreStruct])],
  controllers: [StructureController],
  providers: [StructureService],
  exports :  [StructureService]
})
export class StructureModule {}
