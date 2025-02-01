import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { userSignInDto } from 'src/user/dto/userSignIn.dto';




@Controller('auth')
export class AuthController {

    constructor(private authService:AuthService){}

// @Post('signup')
// async Signup(@Body() userCreate){
// return this.authService.signUp(userCreate)
// }



@Post('signIn')
async SignIn(@Body() usersignIn:userSignInDto){
    return await this.authService.signIn(usersignIn)
}

// @UseGuards(AuthGuard)
@Get("getuser")
async getUser(){
    return await this.authService.getuser()
}
}

