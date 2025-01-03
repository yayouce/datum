import { Module } from '@nestjs/common';
import { FormatfichierService } from './formatfichier.service';
import { FormatfichierController } from './formatfichier.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Formatfichier } from './entities/formatfichier.entity';

@Module({
  imports:[TypeOrmModule.forFeature([Formatfichier])],
  controllers: [FormatfichierController],
  providers: [FormatfichierService],
})
export class FormatfichierModule {}
