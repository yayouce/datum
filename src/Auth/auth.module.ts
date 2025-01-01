import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';

import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constants';
import { AuthController } from './auth.controller';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './Auth.guard';
import { JwtStrategy } from './jwt.strategy';
;
import { JwtCustomModule } from './jwt.module';

import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from 'src/user/user.module';
import { MembreStructModule } from 'src/membre-struct/membre-struct.module';

@Module({
  imports: [UserModule,
    PassportModule,
    JwtCustomModule,
    TypeOrmModule.forFeature([MembreStructModule])
  ],
 
  providers: [
    
    AuthService,
    JwtStrategy    
  ],
  controllers: [AuthController],
})
export class AuthModule {}
