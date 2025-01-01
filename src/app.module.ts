import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembreStructModule } from './membre-struct/membre-struct.module';
import { UserModule } from './user/user.module';
import { StructureModule } from './structure/structure.module';

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
    
    MembreStructModule,
    
    UserModule,
    
    StructureModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
