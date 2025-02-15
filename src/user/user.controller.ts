import { Body, Controller, Get, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserEntity } from './entities/user.entity';


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
}
