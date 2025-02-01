import { IsNotEmpty, IsString } from "class-validator";

export class userSignInDto {

@IsNotEmpty()
@IsString()
email:string;
@IsNotEmpty()
@IsString()
password:string; 
}
