export interface AutorisationsSourceDonnee {
    consulter?: string[]; // Liste des roleMembre ou "Administrateur"
    modifier?: string[];  // Liste des roleMembre ou "Administrateur"
    exporter?: string[];  // Liste des roleMembre ou "Administrateur"
}