// src/user/dto/create-user.dto.ts
import { roleMembreEnum } from '@/generique/rolemembre.enum';
import { UserRole } from '@/generique/userroleEnum';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';


export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  firstname: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  contact: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsEnum(roleMembreEnum)
  roleMembre?: roleMembreEnum;

  @IsOptional()
  @IsString()
  nomStruct?: string;
}
