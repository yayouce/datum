import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';
import { MembreStruct } from '@/membre-struct/entities/membre-struct.entity';
import { User } from '@/decorator/user.decorator';
import { DashboardStatsDto } from '@/structure/dto/dashboard-stats.dto';
import { JwtAuthGuard } from '@/Auth/jwt-auth.guard';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}



  @UseGuards(JwtAuthGuard)
  @Get('stats') // La route sera donc GET /dashboard/stats
  async getDashboardStats(
    @User() currentUser: MembreStruct, // Récupère l'utilisateur authentifié
    @Query('idStruct') idStructQuery?: string, // Paramètre de requête optionnel pour filtrer par structure (pour les admins)
  ): Promise<DashboardStatsDto> {
    // Délègue toute la logique au DashboardService
    return this.dashboardService.getStats(currentUser, idStructQuery);
  }
  
}
