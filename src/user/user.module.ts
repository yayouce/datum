import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MembreStructModule } from 'src/membre-struct/membre-struct.module';
import { UserEntity } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtCustomModule } from 'src/Auth/jwt.module';
import { JwtStrategy } from 'src/Auth/jwt.strategy';
import { MembreStruct } from 'src/membre-struct/entities/membre-struct.entity';
import { SourceDonnee } from '@/source_donnees/entities/source_donnee.entity';
import { SourceDonneesService } from '@/source_donnees/source_donnees.service';
import { SourceDonneesModule } from '@/source_donnees/source_donnees.module';

@Module({
  imports:[
    MembreStructModule,
    JwtCustomModule,
        TypeOrmModule.forFeature([ UserEntity,MembreStruct,SourceDonnee  ]),
        PassportModule.register({
          defaultStrategy: 'jwt'
        }),
       
      ],
  controllers: [UserController],
  providers: [UserService,JwtStrategy],
  exports:[UserService]
})
export class UserModule {}
