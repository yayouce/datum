import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from './constants';

@Module({
  imports: [
    JwtModule.register({
        secret: jwtConstants.secret,
        signOptions: { expiresIn: '1d' }, 
    }),
  ],
  exports: [JwtModule], 
})
export class JwtCustomModule {}