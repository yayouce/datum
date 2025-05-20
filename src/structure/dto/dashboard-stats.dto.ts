// src/dashboard/dto/dashboard-stats.dto.ts
export class DashboardStatsDto {
  structures: {
    total: number;
  };
  demandes: {
    enAttente: number;
    traitees: number;
  };
  utilisateurs: { // Ou membresStructStats si on veut être précis
    admins: number; // Clarification nécessaire
    topManagers: number;
    managers: number;
    coordinateurs: number;
    totalMembresStructure?: number; // Spécifique à la vue "structure"
  };
  projets: {
    actifs: number;
    enPause: number;
    enAttente: number;
    enArret: number;
    totalProjetsStructure?: number; // Spécifique à la vue "structure"
  };
}