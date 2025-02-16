import { HttpException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';


import * as bcrypt from "bcrypt"
import { UserService } from 'src/user/user.service';
import { MembreStruct } from 'src/membre-struct/entities/membre-struct.entity';
import { userSignInDto } from 'src/user/dto/userSignIn.dto';
import { log } from 'console';


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
      console.log(user)
      
        throw new HttpException("email ou mot de passe incorecte",700);
      }

  


      const payload:any = { phonePers:  user.email,rolePers:user.contact };
      if (user instanceof MembreStruct) {
        payload.roleMembre = user.roleMembre;
    }

    return {
      user:user,
      access_token: await this.jwtService.signAsync(payload),
     
    };


    
  };
  
  async signInSup(loginsup){

  }


//    async signUp(userCreate:CreatePersonneDto){


//     const user = await this.userService.createPers(userCreate);
//     return user
//    }



   async getuser(){
    const user=await this.userService.getAllpersonne()
    
   }

   

}