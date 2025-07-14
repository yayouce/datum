import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { In, Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { MembreStructService } from 'src/membre-struct/membre-struct.service';
import * as bcrypt from "bcrypt"
import { UserRole } from '@/generique/userroleEnum';
import { MembreStruct } from '@/membre-struct/entities/membre-struct.entity';
import { SourceDonnee } from '@/source_donnees/entities/source_donnee.entity';

@Injectable()
export class UserService {
    constructor(
      @InjectRepository(UserEntity)
      private userrepo: Repository<UserEntity>,
  
      private membreStructService : MembreStructService,

        @InjectRepository(MembreStruct)
      private membrestructrepo: Repository<MembreStruct>,

      @InjectRepository(SourceDonnee)
    private sourcededonneesrepo: Repository<SourceDonnee>,
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




  private sanitizeUserOutput(user: any): any {
    if (!user) return null;
    const { password, ...rest } = user;
    return rest;
  }

  async findAllUsersAndMembers2(currentUser: MembreStruct /* Ou UserEntity si c'est le type de base */): Promise<any[]> {
    if (currentUser.role === UserRole.SuperAdmin) { // En supposant que UserRole.SUPERADMIN = 'admin'
      // Le SuperAdmin voit tout
      const users = await this.userrepo.find();
      const members = await this.membreStructService.getAllMembres(); // Suppose que getAllMembres retourne tous les MembreStruct

      // Il pourrait y avoir des doublons si un UserEntity est aussi un MembreStruct.
      const allEntries = new Map<string, any>();

      users.forEach(u => {
        if (u.iduser) { // Assurez-vous que vos UserEntity ont un iduser si c'est la clé commune
            allEntries.set(u.iduser, this.sanitizeUserOutput(u));
        } else {
            // Gérer le cas où UserEntity n'a pas iduser ou utiliser un autre ID
            // Pour l'instant, on les ajoute tels quels, ce qui peut ne pas être idéal pour la déduplication
            allEntries.set(u.iduser /* ou autre id unique */, this.sanitizeUserOutput(u));
        }
      });

      members.forEach(m => {
        // Les MembreStruct ont iduser, on écrase l'entrée UserEntity si elle existe
        // pour avoir les infos plus spécifiques de MembreStruct.
        allEntries.set(m.iduser, this.sanitizeUserOutput(m));
      });
      
      return Array.from(allEntries.values());

    } else if (currentUser.role === UserRole.Client) { // En supposant que UserRole.CLIENT = 'client'
      // Le client (membre d'une structure) ne voit que les membres de SA structure
      if (!currentUser.structure || !currentUser.structure.idStruct) {

        console.warn(`findAllUsersAndMembers: Client user ${currentUser.iduser} n'a pas de structure ou d'idStruct défini.`);
        return [];
      }
      // Récupérer les membres de la structure du currentUser
      const membersOfStructure = await this.membreStructService.getMembresByStructureId(currentUser.structure.idStruct);
      return membersOfStructure.map(member => this.sanitizeUserOutput(member));

    } else {
      // Autres rôles non autorisés à voir cette liste ou logique spécifique à implémenter
      throw new ForbiddenException("Vous n'avez pas les droits pour accéder à cette liste d'utilisateurs.");
    }
  }




  // async softDeleteUserOrMember(
  //   idUserToDelete: string,
  //   currentUser: MembreStruct, // L'utilisateur qui effectue l'action
  // ): Promise<{ message: string }> {

  //   // --- 1. Vérification des permissions ---
  //   // Seul un SuperAdmin peut supprimer n'importe quel utilisateur/membre.
  //   // Un client/membre ne devrait pas pouvoir supprimer d'autres utilisateurs via cette route générique.
  //   if (currentUser.role !== UserRole.SuperAdmin) {
  //     throw new ForbiddenException("Vous n'avez pas les droits pour supprimer des utilisateurs.");
  //   }

  //   // Empêcher un SuperAdmin de se supprimer lui-même via cette fonction
  //   if (idUserToDelete === currentUser.iduser) {
  //     throw new ForbiddenException("Vous не pouvez pas vous supprimer vous-même de cette manière.");
  //   }

  //   // --- 2. Essayer de trouver et supprimer comme MembreStruct d'abord ---
  //   const membre = await this.membrestructrepo.findOne({
  //     where: { iduser: idUserToDelete },
  //     // relations: ['structure'] // Optionnel, si besoin pour des logs ou actions pré-suppression
  //   });

  //   if (membre) {
  //     try {
  //       const result = await this.membrestructrepo.softDelete({ iduser: idUserToDelete });
  //       if (result.affected === 0) {
  //         throw new NotFoundException(`Membre avec l'ID ${idUserToDelete} trouvé mais échec du soft delete.`); // Cas étrange
  //       }
  //       return { message: `Membre de structure avec l'ID ${idUserToDelete} marqué comme supprimé avec succès.` };
  //     } catch (error) {
  //       throw new HttpException(`Erreur lors du soft delete du membre ${idUserToDelete}: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  //     }
  //   }

  //   // --- 3. Si ce n'est pas un MembreStruct, essayer comme UserEntity global ---
  //   const user = await this.userrepo.findOne({ where: { iduser: idUserToDelete } });

  //   if (user) {
  //     try {
  //       const result = await this.userrepo.softDelete({ iduser: idUserToDelete });
  //       if (result.affected === 0) {
  //         throw new NotFoundException(`Utilisateur avec l'ID ${idUserToDelete} trouvé mais échec du soft delete.`); // Cas étrange
  //       }
  //       return { message: `Utilisateur global avec l'ID ${idUserToDelete} marqué comme supprimé avec succès.` };
  //     } catch (error) {
  //       throw new HttpException(`Erreur lors du soft delete de l'utilisateur ${idUserToDelete}: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  //     }
  //   }

  //   // --- 4. Si non trouvé du tout ---
  //   throw new NotFoundException(`Utilisateur ou Membre avec l'ID ${idUserToDelete} non trouvé.`);
  // }



async deleteUserOrMember(
  idUserToDelete: string,
  currentUser: MembreStruct, // L'utilisateur qui effectue l'action
): Promise<{ message: string }> {
  // --- 1. Vérification des permissions ---
  // Seul un SuperAdmin peut supprimer n'importe quel utilisateur/membre.
  if (currentUser.role !== UserRole.SuperAdmin) {
    throw new ForbiddenException("Vous n'avez pas les droits pour supprimer des utilisateurs.");
  }
  

  // Empêcher un SuperAdmin de se supprimer lui-même
  if (idUserToDelete === currentUser.iduser) {
    throw new ForbiddenException("Vous ne pouvez pas vous supprimer vous-même de cette manière.");
  }
  const membre = await this.membrestructrepo.findOne({
    where: { iduser: idUserToDelete },
  });

  if (membre) {
    try {
      const result = await this.membrestructrepo.delete({ iduser: idUserToDelete });
      if (result.affected === 0) {
        throw new NotFoundException(`Membre avec l'ID ${idUserToDelete} trouvé mais échec de la suppression.`);
      }
      return { message: `Membre de structure avec l'ID ${idUserToDelete} supprimé définitivement avec succès.` };
    } catch (error) {
      throw new HttpException(
        `Erreur lors de la suppression du membre ${idUserToDelete}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // --- 3. Si aucun membre n'est trouvé ---
  throw new NotFoundException(`Aucun membre trouvé avec l'ID ${idUserToDelete}.`);
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


  async findby(userIds: string[]): Promise<(UserEntity | MembreStruct)[]> {
  console.log('[UserService.findby] Input userIds:', JSON.stringify(userIds));

  if (!userIds || userIds.length === 0) {
    console.log('[UserService.findby] Error: User IDs array is null or empty.');
    throw new BadRequestException('User IDs array cannot be null or empty.');
  }

  // 1. Rechercher dans userrepo
  const existingUsers = await this.userrepo.find({
    where: { iduser: In(userIds) },
  });
  const foundUserIdsSet = new Set(existingUsers.map(u => u.iduser));

  // 2. Identifier les IDs manquants
  const missingUserIds = userIds.filter(id => !foundUserIdsSet.has(id));

  // 3. Rechercher dans membreStructRepo les utilisateurs manquants
  let additionalUsers: MembreStruct[] = [];
  if (missingUserIds.length > 0) {
    additionalUsers = await this.membrestructrepo.find({
      where: { iduser: In(missingUserIds) },
    });
  }

  const allFoundUsers = [...existingUsers, ...additionalUsers];
  const allFoundUserIdsSet = new Set(allFoundUsers.map(u => u.iduser));
  const stillMissingIds = userIds.filter(id => !allFoundUserIdsSet.has(id));

  // 4. Vérifier s'il reste des IDs manquants
  if (stillMissingIds.length > 0) {
    console.log('[UserService.findby] Error: Some user IDs not found in any repo:', JSON.stringify(stillMissingIds));
    throw new NotFoundException(`Users not found: ${stillMissingIds.join(', ')}.`);
  }

  console.log('[UserService.findby] Success: All users found across both repositories.');
  return allFoundUsers;
}


}
  