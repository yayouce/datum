import { Module } from '@nestjs/common';
import { DataTypeService } from './data_type.service';
import { DataTypeController } from './data_type.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataType } from './entities/data_type.entity';

@Module({
  imports:[TypeOrmModule.forFeature([DataType])],
  controllers: [DataTypeController],
  providers: [DataTypeService],
  exports:[DataTypeService]
})
export class DataTypeModule {}
