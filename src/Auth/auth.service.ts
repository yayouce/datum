import { HttpException, HttpStatus, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';


import * as bcrypt from "bcrypt"
import { UserService } from 'src/user/user.service';
import { MembreStruct } from 'src/membre-struct/entities/membre-struct.entity';
import { userSignInDto } from 'src/user/dto/userSignIn.dto';
import { log } from 'console';
import { UserEntity } from '@/user/entities/user.entity';
import { UserRole } from '@/generique/userroleEnum';


const saltOrRounds = 10;

@Injectable()
export class AuthService {

    constructor(
        private  userService : UserService,
        private jwtService: JwtService
    ){}


   async signIn(signIndata:userSignInDto){
    const user = await this.userService.findPersByPhone(signIndata.email)
    console.log(user);
    

    if (!user || !await bcrypt.compare(signIndata.password, user?.password) ) {
      
      
        throw new HttpException("email ou mot de passe incorecte",700);
      }
      const payload:any = { email:  user.email,role:user.role,contact:user.contact }
      if (user instanceof MembreStruct) {
        payload.roleMembre = user.roleMembre;

    }

    
    const { password, ...result } = user;
    
    return {
      user:result,
      access_token: await this.jwtService.signAsync(payload),
     
    };


    
  };


async signIn2(signInData: userSignInDto) { 
    // comme 'structure' si l'utilisateur est un MembreStruct.
    const user = await this.userService.findPersByPhone(signInData.email); // Ou findUserByEmail si c'est un email

    console.log("User found:", user);

    if (!user || !(await bcrypt.compare(signInData.password, user.password))) {
      throw new HttpException("Email ou mot de passe incorrect.", HttpStatus.UNAUTHORIZED); // 700 est non standard, HttpStatus.UNAUTHORIZED (401) est mieux
    }

    // --- VÉRIFICATIONS D'ADHÉSION ---
    if (user instanceof MembreStruct) {
      const membre = user as MembreStruct; // Cast pour l'autocomplétion

      // Vérification 1: Adhésion personnelle du MembreStruct
      if (membre.adhesion === false) {
        console.log(`Login attempt denied for ${membre.email}: Membre adhesion is false.`);
        throw new HttpException("Votre adhésion à la structure n'a pas encore été validée ou a été refusée.", HttpStatus.FORBIDDEN); // 403 Forbidden
      }

      // Vérification 2: Adhésion de la Structure du MembreStruct
      if (!membre.structure) {
        // Ce cas est anormal si un MembreStruct doit toujours avoir une structure.
        console.error(`Login attempt error for ${membre.email}: MembreStruct ${membre.iduser} has no associated structure loaded.`);
        throw new HttpException("Erreur de configuration : structure de l'utilisateur non trouvée.", HttpStatus.INTERNAL_SERVER_ERROR);
      }
      
      if (membre.structure.adhesion === false) {
        console.log(`Login attempt denied for ${membre.email}: Structure ${membre.structure.nomStruct} adhesion is false.`);
        if (membre.structure.deletedAt) {
             throw new HttpException("L'adhésion de votre structure a été refusée et la structure n'est plus active.", HttpStatus.FORBIDDEN);
        } else {
             throw new HttpException("L'adhésion de votre structure est en attente de validation.", HttpStatus.FORBIDDEN);
        }
      }
    } 
    // Les SuperAdmins (user.role === UserRole.SuperAdmin) peuvent se connecter sans ces vérifications d'adhésion de structure.

    // --- PRÉPARATION DU PAYLOAD JWT ---
    const payload: any = {
      sub: user.iduser, // 'sub' (subject) est la convention pour l'ID de l'utilisateur dans le JWT
      email: user.email,
      role: user.role, // Role global de UserEntity
     
    };

    if (user instanceof MembreStruct) {
      payload.roleMembre = user.roleMembre; // Role spécifique dans la structure
      if (user.structure && user.structure.idStruct) {
        payload.idStruct = user.structure.idStruct; // ID de sa structure
        payload.nomStruct = user.structure.nomStruct; // Nom de sa structure
      }
    }

    // Retirer le mot de passe et autres infos sensibles de l'objet utilisateur retourné
    const { password, ...result } = user;

    return {
      user: this.sanitizeUserForResponse(result), // Utilisez une fonction pour nettoyer la réponse
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  // Fonction helper pour nettoyer l'objet utilisateur avant de le retourner au client
  private sanitizeUserForResponse(userObject: any): any {
    if (!userObject) return null;
    // Exclure password, et potentiellement d'autres champs que vous ne voulez pas exposer
    const { password, deletedAt, ...sanitizedUser } = userObject; 
    
    // Si l'objet utilisateur a une relation 'structure', vous pourriez vouloir la nettoyer aussi
    if (sanitizedUser.structure) {
        const { membres, projet, ...sanitizedStructure } = sanitizedUser.structure;
        sanitizedUser.structure = sanitizedStructure;
    }
    // Faites de même pour d'autres relations si nécessaire

    return sanitizedUser;
  }


  
  async signInSup(loginsup){

  }


//    async signUp(userCreate:CreatePersonneDto){


//     const user = await this.userService.createPers(userCreate);
//     return user
//    }



   async getuser(){
    const user=await this.userService.getAllpersonne()
    return user
    
   }

   

}