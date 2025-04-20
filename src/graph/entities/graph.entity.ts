// src/graph/entities/graph.entity.ts

import { TimestampEntites } from "src/generique/timestamp";
import { TypeGeometrieMap, typegraphiqueEnum } from "@/generique/cartes.enum"; // Assurez-vous que cet enum est à jour
import { SourceDonnee } from "src/source_donnees/entities/source_donnee.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

// ==================================================================
// == DEFINITIONS DES TYPES GEOSPATIAUX (AJOUTEES ET EXPORTEES) ==
// ==================================================================



// --- Interface pour la configuration géographique ---
export interface ConfigGeographique {
  typeGeometrie: TypeGeometrieMap;
  feuille: string;       // Clé du groupe dans bd_normales (ex: "group_fu8vs82")

  // Champs conditionnels (selon typeGeometrie)
  colonneLatitude?: string;   // En-tête de la colonne Latitude (pour POINT)
  colonneLongitude?: string;  // En-tête de la colonne Longitude (pour POINT)
  colonneTrace?: string;      // En-tête de la colonne contenant le tracé (pour POLYGONE/LIGNE)

}

// --- Interface pour la configuration des colonnes d'étiquettes ---
export interface ColonneEtiquetteConfig {
  colonne: string;      // En-tête de la colonne source (ex: "User_Name")
  // libelleAffichage: string; // Nom à afficher dans le popup (ex: "Nom Producteur")
}



@Entity("graph")
export class Graph extends TimestampEntites {
  @PrimaryGeneratedColumn("uuid")
  idgraph: string;

  @Column({ type: "enum", enum: typegraphiqueEnum }) // Utilise l'enum mis à jour
  typeGraphique: typegraphiqueEnum; // Le type de graphique (classique ou géo)

  @Column()
  titreGraphique: string;

  @Column({
    default:false
  })
  inStudio:boolean;

  // --- Champs pour Graphiques Classiques ---
  //nullable si un graphique ne peut pas être à la fois classique et géo
  @Column({ type: "json", nullable: true }) 
  colonneX: any | null; // Stocke soit la définition, soit les valeurs extraites (selon votre choix dans le service)

  @Column({ type: "json", nullable: true }) 
  colonneY: any | null; // Stocke soit la définition, soit les valeurs extraites

  // pour Graphiques Géospatiaux 
  @Column({ type: 'json', nullable: true }) 
  configGeographique: ConfigGeographique | null; // Stocke la configuration géo

  @Column({ type: 'json', nullable: true }) 
  colonnesEtiquettes: ColonneEtiquetteConfig[] | null; // Stocke la configuration des étiquettes

  // --- Relation et autres métadonnées ---
  @Column({ nullable: true }) // Peut être redondant si la relation est toujours chargée
  nomsourceDonnees: string | null;

  @ManyToOne(() => SourceDonnee, (sourcedonnee) => sourcedonnee.graphique, {
      // eager: false, // Définissez les options de chargement selon vos besoins
      // cascade: false,
  })
  @JoinColumn({ name: "sourcesIdsourceDonnes" })
  sources: SourceDonnee; // La relation vers la source

  @Column({ type: "uuid" }) // Doit correspondre à la clé primaire de SourceDonnee (non nullable si requis)
  sourcesIdsourceDonnes: string; // La clé étrangère

  @Column({ type: "json", nullable: true })
  titremetaDonnees: {
    couleurTitre?: string;
    couleurFond?: string;
  } | null;

  @Column({ type: 'json', nullable: true })
metaDonnees: {
  /**
   * Orientation des étiquettes (attendu : "horizontal" ou "vertical")
   */
  sensEtiquette?: string;

  /**
   * Position des étiquettes (attendu : "interieure" ou "exterieure")
   */
  positionEtiquette?: string;

  /**
   * Position de la légende (attendu : "haut", "bas", "gauche", "droite")
   */
  positionLegende?: string;

  axesSpecifies?: { x?: boolean; y?: boolean; };

  couleurs?: {
    generiques?: string[];
    specifiques?: string[];
  };

  colonneXOriginale?: string;
} | null;

}

export { TypeGeometrieMap };
