// src/auth/decorators/current-user.decorator.ts

import { UserEntity } from '@/user/entities/user.entity';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
 // Adaptez le chemin vers votre UserEntity

/**
 * Décorateur de paramètre personnalisé pour extraire l'objet 'user'
 * attaché à la requête par le Guard d'authentification (ex: AuthGuard('jwt')).
 *
 * Utilisation: Dans une méthode de contrôleur:
 * async maMethode(@CurrentUser() user: UserEntity) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserEntity | null => {
    // ExecutionContext fournit l'accès à la requête sous-jacente de manière agnostique
    const request = ctx.switchToHttp().getRequest();
    // Retourne la propriété 'user' de la requête, ou null si elle n'existe pas
    return request.user ? (request.user as UserEntity) : null;
    // Le 'as UserEntity' est une assertion de type basée sur le fait
    // que votre AuthGuard ('jwt') est censé peupler request.user avec une instance de UserEntity.
  },
);