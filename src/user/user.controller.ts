import { Body, Controller, Get, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserEntity } from './entities/user.entity';
import { ArrayMinSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';
export class TestFindUsersDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  userIds: string[];
}

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}




  @Post('add/supAdmin')
  async createUser(@Body() createUserDto: CreateUserDto): Promise<UserEntity> {
    return this.userService.createUser(createUserDto);
  }


  @Get('/all')
  async getAllUsers() {
    return await this.userService.findAllUsersAndMembers();
  }

  // @Get('/count')
  // async getTotalUsers() {
  //   return await this.userService.getTotalUserCount();
  // }

  @Get('/roles-count')
  async getUserRoleCounts() {
    return await this.userService.getUserRoleCounts();
  }



  @Post('test-findby')
  async testFindbyMultipleUsers(@Body() testFindUsersDto: TestFindUsersDto): Promise<UserEntity[]> {
    // Call the method from UserService
    // Assuming your method in UserService is named 'findby'
    return this.userService.findby(testFindUsersDto.userIds);
  }
}
