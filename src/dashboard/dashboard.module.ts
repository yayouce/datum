import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StructureModule } from '@/structure/structure.module';
import { MembreStructModule } from '@/membre-struct/membre-struct.module';
import { ProjetModule } from '@/projet/projet.module';
import { UserEntity } from '@/user/entities/user.entity';

@Module({

   imports: [
    TypeOrmModule.forFeature([UserEntity]), // Pour injecter UserRepository<UserEntity>
    StructureModule,    // Doit exporter StructureService
    MembreStructModule, // Doit exporter MembreStructService
    ProjetModule,       // Doit exporter ProjetService
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
