import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsBufferConstraint implements ValidatorConstraintInterface {
    validate(value: any): boolean {
        return Buffer.isBuffer(value);  // Validation : retourne true si c'est un Buffer
    }

    defaultMessage(): string {
        return 'La valeur fournie n\'est pas un Buffer valide.';  // Message d'erreur personnalisé
    }
}

// Décorateur réutilisable dans vos DTOs
export function IsBuffer(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsBufferConstraint,
        });
    };
}
