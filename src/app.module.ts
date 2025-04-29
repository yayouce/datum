import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembreStructModule } from './membre-struct/membre-struct.module';
import { UserModule } from './user/user.module';
import { StructureModule } from './structure/structure.module';
import { AuthModule } from './Auth/auth.module';
import { ProjetModule } from './projet/projet.module';
import { AteliersModule } from './ateliers/ateliers.module';
import { EnqueteModule } from './enquete/enquete.module';
import { FormatfichierModule } from './formatfichier/formatfichier.module';
import { DataTypeModule } from './data_type/data_type.module';
import { SourceDonneesModule } from './source_donnees/source_donnees.module';
import { UnitefrequenceModule } from './frequence/unitefrequence.module';
import { GraphModule } from './graph/graph.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal:true}),
    
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password:process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: ["dist/**/*.entity{.ts,.js}"],
      synchronize: true,
    }),
    ScheduleModule.forRoot(),
    MembreStructModule,
    UserModule,
    AuthModule,
    StructureModule,
    ProjetModule,
    AteliersModule,
    EnqueteModule,
    FormatfichierModule,
    DataTypeModule,
    UnitefrequenceModule,
    SourceDonneesModule,
    GraphModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
