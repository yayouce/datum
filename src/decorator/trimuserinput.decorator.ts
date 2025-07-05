import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function Trim(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'trim',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value === 'string') {
            const trimmedValue = value.trim();
            // Met à jour la valeur de la propriété
            (args.object as any)[args.property] = trimmedValue;
            return true; // La validation passe toujours, car on modifie la valeur
          }
          return true;
        },
      },
    });
  };
}