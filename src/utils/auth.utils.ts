import { HttpException, HttpStatus } from "@nestjs/common";

export function checkAdminAccess(user: any) {
  if (!user || user.role === 'client') {
    throw new HttpException('Accès refusé', HttpStatus.FORBIDDEN);
  }
}