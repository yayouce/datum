import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
;
import { JwtCustomModule } from './jwt.module';

import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from 'src/user/user.module';

import { MembreStruct } from 'src/membre-struct/entities/membre-struct.entity';

@Module({
  imports: [UserModule,
    PassportModule,
    JwtCustomModule,
    TypeOrmModule.forFeature([MembreStruct])
  ],
 
  providers: [
    
    AuthService,
    JwtStrategy    
  ],
  controllers: [AuthController],
  
})
export class AuthModule {}
