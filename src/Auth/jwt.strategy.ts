import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport'
import { HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtConstants } from './constants';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { payloadInterface } from 'src/Interfaces/payloadInterface.interface';
import { UserEntity } from '@/user/entities/user.entity';
import { MembreStruct } from '@/membre-struct/entities/membre-struct.entity';



type ValidatedUser = Omit<UserEntity, 'password'> | Omit<MembreStruct, 'password'>;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(MembreStruct)
    private membreStructrepo:Repository<MembreStruct>,
    @InjectRepository(UserEntity)
    private userrepo:Repository<UserEntity>
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  async validate(payload: payloadInterface): Promise<ValidatedUser> {
    if (!payload || !payload.email) {
      throw new HttpException('Payload invalide ou email manquant.',800);
    }

    let user: UserEntity | MembreStruct | null = null;

    try {
      console.log(`Tentative de recherche spécifique MembreStruct pour: ${payload.email}`);
      // 1. Essayer avec le repo MembreStruct d'abord
      user = await this.membreStructrepo.findOne({ where: { email: payload.email } });

      if (!user) {
        console.log(`Non trouvé comme MembreStruct, tentative UserEntity pour: ${payload.email}`);
        // 2. Si non trouvé, essayer avec le repo UserEntity
        user = await this.userrepo.findOne({ where: { email: payload.email } });
  
      }
    } catch (error) {
        console.error("Erreur lors de la recherche séquentielle:", error);
        throw new HttpException("Erreur lors de la validation de l'utilisateur.",800);
    }

    // 3. Vérifier le résultat
    if (user) {
       console.log('Utilisateur final validé:', user instanceof MembreStruct ? 'MembreStruct' : 'UserEntity');
       const { password, ...result } = user;
       return result;
    } else {
       console.warn(`Utilisateur non trouvé pour email ${payload.email} (ni via membreStructrepo, ni userrepo).`);
       throw new HttpException("Utilisateur associé au token non trouvé.",800);
    }
  }
}