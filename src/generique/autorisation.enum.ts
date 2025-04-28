// Définit les actions possibles sur une source de données
export enum SourceDonneeAction {
    CONSULTER = 'consulter',
    MODIFIER = 'modifier',
    EXPORTER = 'exporter',
}


export enum SourceDonneeRole {
    TOP_MANAGER = 'Top manager',
    MANAGER = 'Manager',
    COORDINATEUR = 'Coordinateur',
}

// Assurez-vous d'avoir aussi un enum pour les roles plateformes
export enum Role {
    SUPERADMIN = 'superadmin',
    ADMIN = 'admin',
    CLIENT = 'client', // Les MembreStruct ont ce rôle global
}
