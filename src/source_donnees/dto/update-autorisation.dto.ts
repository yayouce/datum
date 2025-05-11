// src/source-donnees/dto/toggle-permissions-array.dto.ts
import { Type } from 'class-transformer';
import { IsArray, ArrayNotEmpty, ValidateNested, IsString, IsIn, IsUUID, ArrayMinSize } from 'class-validator';
import { AutorisationsSourceDonnee } from '@/utils/autorisation'; // Adjust path

export type SourceDonneePermissionAction = keyof AutorisationsSourceDonnee;

export class UserPermissionToggleDto {
  @IsString()
  @IsIn(['modifier', 'visualiser', 'telecharger'])
  action: SourceDonneePermissionAction;

  @IsArray()
  @ArrayNotEmpty() // Each action in the request should specify users to toggle
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  userIds: string[]; // Users to toggle for this specific action
}

export class TogglePermissionsArrayDto {
  @IsArray()
  @ArrayNotEmpty() // The request must contain at least one permission operation
  @ValidateNested({ each: true }) // Validates each UserPermissionToggleDto in the array
  @Type(() => UserPermissionToggleDto)  // Tells class-validator the type of array elements
  permissions: UserPermissionToggleDto[];
}