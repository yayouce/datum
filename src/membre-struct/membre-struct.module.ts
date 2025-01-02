import { Module } from '@nestjs/common';
import { MembreStructService } from './membre-struct.service';
import { MembreStructController } from './membre-struct.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembreStruct } from './entities/membre-struct.entity';
import { JwtCustomModule } from 'src/Auth/jwt.module';
import { StructureModule } from 'src/structure/structure.module';
import { MailService } from 'src/utils/mail.service';

@Module({
  imports:[TypeOrmModule.forFeature([MembreStruct]),JwtCustomModule,StructureModule],
  controllers: [MembreStructController],
  providers: [MembreStructService,MailService],
  exports:[MembreStructService]
})
export class MembreStructModule {}
