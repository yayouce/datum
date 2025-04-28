export class OrgChartNodeDto {
    /**
     * Identifiant unique du membre
     * @example "uuid-membre-1"
     */
    id: string;

    /**
     * Identifiant unique du supérieur hiérarchique
     * @example "uuid-manager-1"
     * @nullable true
     */
    superieur: string | null;

    nom_prenom: string;

    /**
     * Rôle/Titre du membre
     * @example "Coordinateur N1"
     */
    roleMembre: string;

    /**
     * Email du membre
     * @example "jean.dupont@example.com"
     */
    email: string;

    // Ajoutez d'autres champs si nécessaire pour l'affichage
}