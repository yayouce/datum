import { Module } from '@nestjs/common';
import { EnqueteService } from './enquete.service';
import { EnqueteController } from './enquete.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enquete } from './entities/enquete.entity';
import { ProjetService } from 'src/projet/projet.service';
import { ProjetModule } from 'src/projet/projet.module';

@Module({

  imports:[TypeOrmModule.forFeature([Enquete]),ProjetModule],
  controllers: [EnqueteController],
  providers: [EnqueteService],
})
export class EnqueteModule {}
