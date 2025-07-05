import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserEntity } from './entities/user.entity';
import { ArrayMinSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';
import { JwtAuthGuard } from '@/Auth/jwt-auth.guard';
import { User } from '@/decorator/user.decorator';
import { MembreStruct } from '@/membre-struct/entities/membre-struct.entity';
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


  @UseGuards(JwtAuthGuard)
  @Get('/all')
  async getAllUsers(@User() user: MembreStruct) {
    return await this.userService.findAllUsersAndMembers2(user);
  }



  @Post('delete/:idUserToDelete')
  @UseGuards(JwtAuthGuard)
  async deleteUserOrMember(
    @Param('idUserToDelete') idUserToDelete: string,
    @User() currentUser: MembreStruct, // L'utilisateur qui effectue l'action
  ): Promise<{ message: string }> {
    return await this.userService.deleteUserOrMember(idUserToDelete, currentUser);
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
  async testFindbyMultipleUsers(@Body() testFindUsersDto: TestFindUsersDto) {
    // Call the method from UserService
    // Assuming your method in UserService is named 'findby'
    return this.userService.findby(testFindUsersDto.userIds);
  }
}
