import { IsNotEmpty, IsString, IsUUID, IsIn, IsArray, ArrayNotEmpty, ArrayMinSize } from 'class-validator';
import { AutorisationsSourceDonnee } from '@/utils/autorisation';

export type SourceDonneePermissionAction = keyof AutorisationsSourceDonnee; // 'modifier' | 'visualiser' | 'telecharger'

export class UpdateAutorisationsDto { // Renamed for clarity
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true }) // Validates each element in the array is a UUID
  userIds: string[]; // Changed from userId to userIds and made it an array

  @IsNotEmpty()
  @IsString()
  @IsIn(['modifier', 'visualiser', 'telecharger'])
  action: SourceDonneePermissionAction;
}