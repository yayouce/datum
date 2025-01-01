import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport'
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtConstants } from './constants';
import { userInfo } from 'os';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MembreStruct } from 'src/membre-struct/entities/membre-struct.entity';
import { payloadInterface } from 'src/Interfaces/payloadInterface.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(MembreStruct)
    private membreStructrepo:Repository<MembreStruct>
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  async validate(payload:payloadInterface) {

   const user= await this.membreStructrepo.findOne({where:{email:payload.email}})

   if(user){
    const {password,...result}=user
    delete user.password

    return result
   }

   else{
    throw new UnauthorizedException()
   }



  }
}