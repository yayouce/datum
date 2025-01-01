import { IsNotEmpty, isNotEmpty, IsString } from "class-validator";

export class userSignInDto {

@IsNotEmpty()
@IsString()
email:string;
@IsNotEmpty()
@IsString()
password:string; 
}
