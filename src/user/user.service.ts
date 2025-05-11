import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { In, Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { MembreStructService } from 'src/membre-struct/membre-struct.service';
import * as bcrypt from "bcrypt"
import { UserRole } from '@/generique/userroleEnum';

@Injectable()
export class UserService {
    constructor(
      @InjectRepository(UserEntity)
      private userrepo: Repository<UserEntity>,
  
      private membreStructService : MembreStructService
    ){}
  
  
    async findOnePersById(
      iduser: string,
    ) {
     const user = await this.userrepo.findBy({
        iduser
      });
      
      if(!user){
        throw new NotFoundException('utilisateur n`\'existe pas!')
      }
  
  
      return user
  
    }
  
  
    async findPersByPhone(email: string) {
      const user = await this.userrepo.findOne({ where: { email } });
    
      if (!user) {
        return this.membreStructService.findOnemembreByemail(email);
      }
    
      return user;
    }
    

  
  
    async createPers(userData:CreateUserDto):Promise<UserEntity>{
      const user= this.userrepo.create(userData)
     return user
  
  }
  
  async getAllpersonne(){
    const users= this.userrepo.find()
  if(!users){
    throw new NotFoundException('nothing')
  }
  
  return users
  
  }



  async createUser(userData: CreateUserDto): Promise<UserEntity> {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await this.userrepo.findOne({
      where: [{ email: userData.email }, { contact: userData.contact }],
    });

    if (userData.role === UserRole.Client) {
      throw new HttpException("impossible",704)}
    if (existingUser) {
      throw new HttpException('Utilisateur déjà existant', 701);
    }

    // Hacher le mot de passe
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    // Créer et sauvegarder le nouvel utilisateur
    const newUser = this.userrepo.create({
      ...userData,
      password: hashedPassword,
    });

    return this.userrepo.save(newUser);
  }



 async findAllUsersAndMembers() {
  // Récupérer tous les utilisateurs
  const users = await this.userrepo.find();
  const members = await this.membreStructService.getAllMembres();
  const usersSanitized = users.map(({ password, ...rest }) => rest);
  const membersSanitized = members.map(({ password, ...rest }) => rest);
  const allUsers = [...usersSanitized, ...membersSanitized];
  return allUsers;
}




  async getUserRoleCounts() {
    // Compter les admins et superadmins dans la table user
    const totalAdmin = await this.userrepo.count({ where: { role: UserRole.Admin } });
    const totalSuperAdmin = await this.userrepo.count({ where: { role: UserRole.SuperAdmin } });
  
    // Compter les rôles spécifiques aux membres dans la table membre_struct
    const totalTopManager = await this.membreStructService.countByRole('Top manager');
    const totalManager = await this.membreStructService.countByRole('manager');
    const totalCoordinateur = await this.membreStructService.countByRole('coordinateur');
  
    // Retourner l'objet avec le détail des rôles
    return {
      totalAdmin,
      totalSuperAdmin,
      totalTopManager,
      totalManager,
      totalCoordinateur
    };
  }



   // In UserService
  async findby(userIds: string[]): Promise<UserEntity[]> {
      // Add logs for detailed debugging during testing
      console.log('[UserService.findby] Input userIds:', JSON.stringify(userIds));

      if (!userIds || userIds.length === 0) {
        console.log('[UserService.findby] Error: User IDs array is null or empty.');
        throw new BadRequestException('User IDs array cannot be null or empty.');
      }

      const existingUsers = await this.userrepo.find({
        where: { iduser: In(userIds) },
      });
      console.log('[UserService.findby] Users found in DB:', JSON.stringify(existingUsers.map(u => u.iduser)));


      if (existingUsers.length !== userIds.length) {
        const foundUserIdsSet = new Set(existingUsers.map(u => u.iduser));
        const notFoundUserIds = userIds.filter(id => !foundUserIdsSet.has(id));
        console.log('[UserService.findby] Error: Not all users found. Missing:', JSON.stringify(notFoundUserIds));
        throw new NotFoundException(`Users not found: ${notFoundUserIds.join(', ')}.`);
      }

      console.log('[UserService.findby] Success: All users found.');
      return existingUsers;
  }


}
  