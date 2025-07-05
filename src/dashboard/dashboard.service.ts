import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';
import { StructureService } from '@/structure/structure.service';
import { MembreStructService } from '@/membre-struct/membre-struct.service';
import { ProjetService } from '@/projet/projet.service';
import { UserEntity } from '@/user/entities/user.entity';
import { IsNull, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { etatprojetEnum } from '@/generique/etatprojetEnum.enum';
import { roleMembreEnum } from '@/generique/rolemembre.enum';
import { DashboardStatsDto } from '@/structure/dto/dashboard-stats.dto';
import { UserRole } from '@/generique/userroleEnum';
import { MembreStruct } from '@/membre-struct/entities/membre-struct.entity';

@Injectable()
export class DashboardService {


  constructor(
private readonly structureService: StructureService,
    private readonly membreStructService: MembreStructService,
    private readonly projetService: ProjetService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,

  ){
  }
  async getStats(currentUser: MembreStruct, idStructQuery?: string): Promise<DashboardStatsDto> {
     const stats: DashboardStatsDto = {
       structures: { total: 0 },
       demandes: { enAttente: 0, traitees: 0 },
       utilisateurs: { admins: 0, topManagers: 0, managers: 0, coordinateurs: 0 },
       projets: { actifs: 0, enPause: 0, enAttente: 0, enArret: 0 },
     };

     if (currentUser.role !== UserRole.Client) {
       if (idStructQuery) {
         return this.getStatsForSpecificStructure(idStructQuery, stats, true);
       } else {
         return this.getGlobalStats(stats);
       }
     } else if (currentUser.role === 'client') {
       if (idStructQuery && currentUser.structure && idStructQuery !== currentUser.structure.idStruct) {
         throw new ForbiddenException("Vous ne pouvez voir que les statistiques de votre propre structure.");
       }
       if (!currentUser.structure || !currentUser.structure.idStruct) {
         throw new NotFoundException("Structure de l'utilisateur non trouvée ou non définie.");
       }
       return this.getStatsForSpecificStructure(currentUser.structure.idStruct, stats, false);
     } else {
       throw new ForbiddenException("Accès non autorisé au tableau de bord.");
     }
 }

 private async getGlobalStats(stats: DashboardStatsDto): Promise<DashboardStatsDto> {
     const { total: totalStructures } = await this.structureService.getTotalStructures();
     stats.structures.total = totalStructures;

     const structuresEnAttente = await this.structureService.countStructuresEnAttente();
     const structuresApprouvees = await this.structureService.countStructuresApprouvees();
     
     const membresEnAttente = await this.membreStructService.countMembresEnAttenteAdhesionGlobal();
     const membresApprouves = await this.membreStructService.countMembresAdhesionValideeGlobal();
     stats.demandes.enAttente = structuresEnAttente + membresEnAttente;
     stats.demandes.traitees = structuresApprouvees + membresApprouves;

     stats.utilisateurs.admins = await this.userRepository.count({
         where: { role: UserRole.Admin, deletedAt: IsNull() },
     });
     stats.utilisateurs.topManagers = await this.membreStructService.countMembresByRoleGlobal(roleMembreEnum.TOPMANAGER);
     stats.utilisateurs.managers = await this.membreStructService.countMembresByRoleGlobal(roleMembreEnum.MANAGER);
     stats.utilisateurs.coordinateurs = await this.membreStructService.countMembresByRoleGlobal(roleMembreEnum.COORDINATEUR);
     stats.projets.actifs = await this.projetService.countProjetsByEtatGlobal(etatprojetEnum.En_cours);
     stats.projets.enPause = await this.projetService.countProjetsByEtatGlobal(etatprojetEnum.En_pause);
     stats.projets.enAttente = await this.projetService.countProjetsByEtatGlobal(etatprojetEnum.En_attente);
     stats.projets.enArret = await this.projetService.countProjetsByEtatGlobal(etatprojetEnum.A_larret);
     return stats;
 }

 private async getStatsForSpecificStructure(idStruct: string, stats: DashboardStatsDto, isCalledByAdmin: boolean): Promise<DashboardStatsDto> {
     const structureExists = await this.structureService.getOneStructure(idStruct);
     if (!structureExists) {
         throw new NotFoundException(`Structure avec l'ID ${idStruct} non trouvée.`);
     }
     
     stats.structures.total = 1;

     stats.demandes.enAttente = await this.membreStructService.countMembresEnAttenteInStructure(idStruct);
     stats.demandes.traitees = await this.membreStructService.countMembresValidesInStructure(idStruct);

     stats.utilisateurs.totalMembresStructure = await this.membreStructService.countMembresInStructure(idStruct);
     stats.utilisateurs.admins = 0; 
     stats.utilisateurs.topManagers = await this.membreStructService.countMembresInStructureByRole(idStruct, roleMembreEnum.TOPMANAGER);
     stats.utilisateurs.managers = await this.membreStructService.countMembresInStructureByRole(idStruct, roleMembreEnum.MANAGER);
     stats.utilisateurs.coordinateurs = await this.membreStructService.countMembresInStructureByRole(idStruct, roleMembreEnum.COORDINATEUR);
     
     stats.projets.totalProjetsStructure = await this.projetService.countProjetsInStructure(idStruct);
     stats.projets.actifs = await this.projetService.countProjetsInStructureByEtat(idStruct, etatprojetEnum.En_cours);
     stats.projets.enPause = await this.projetService.countProjetsInStructureByEtat(idStruct, etatprojetEnum.En_pause);
     stats.projets.enAttente = await this.projetService.countProjetsInStructureByEtat(idStruct, etatprojetEnum.En_attente);
     stats.projets.enArret = await this.projetService.countProjetsInStructureByEtat(idStruct, etatprojetEnum.A_larret);
     return stats;
 }
}
