
import { IsNotEmpty, IsString, IsUUID, IsIn } from 'class-validator';
import { AutorisationsSourceDonnee } from '@/utils/autorisation'; // Make sure this path is correct

// Define the possible action keys more strictly if possible
export type SourceDonneePermissionAction = keyof AutorisationsSourceDonnee; // 'modifier' | 'visualiser' | 'telecharger'

export class UpdateAutorisationDto {
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['modifier', 'visualiser', 'telecharger']) // Validate against allowed actions
  action: SourceDonneePermissionAction;
}