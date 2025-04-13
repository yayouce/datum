// src/graph/entities/graph.entity.ts

import { TimestampEntites } from "src/generique/timestamp";
import { typegraphiqueEnum } from "src/generique/typegraphique.enum"; // Assurez-vous que cet enum est à jour
import { SourceDonnee } from "src/source_donnees/entities/source_donnee.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

// ==================================================================
// == DEFINITIONS DES TYPES GEOSPATIAUX (AJOUTEES ET EXPORTEES) ==
// ==================================================================

// --- Enum pour les types de géométrie ---
export enum TypeGeometrieMap {
  POINT = 'point',
  POLYGONE = 'polygone',
  LIGNE = 'ligne',
  CHOROPLETHE = 'choroplethe', // Si vous l'implémentez
}

// --- Interface pour la configuration géographique ---
export interface ConfigGeographique {
  typeGeometrie: TypeGeometrieMap;
  nomGroupeDonnees: string;       // Clé du groupe dans bd_normales (ex: "group_fu8vs82")

  // Champs conditionnels (selon typeGeometrie)
  colonneLatitudeHeader?: string;   // En-tête de la colonne Latitude (pour POINT)
  colonneLongitudeHeader?: string;  // En-tête de la colonne Longitude (pour POINT)
  colonneTraceHeader?: string;      // En-tête de la colonne contenant le tracé (pour POLYGONE/LIGNE)
  // colonneIdentifiantGeoHeader?: string; // Pour CHOROPLETHE
  // colonneValeurChoroHeader?: string;    // Pour CHOROPLETHE
  // formuleValeurChoro?: string;          // Pour CHOROPLETHE
}

// --- Interface pour la configuration des colonnes d'étiquettes ---
export interface ColonneEtiquetteConfig {
  headerText: string;      // En-tête de la colonne source (ex: "User_Name")
  libelleAffichage: string; // Nom à afficher dans le popup (ex: "Nom Producteur")
}

// ==================================================================
// ==                DEFINITION DE L'ENTITE GRAPH                  ==
// ==================================================================

@Entity("graph")
export class Graph extends TimestampEntites {
  @PrimaryGeneratedColumn("uuid")
  idgraph: string;

  @Column({ type: "enum", enum: typegraphiqueEnum }) // Utilise l'enum mis à jour
  typeGraphique: typegraphiqueEnum; // Le type de graphique (classique ou géo)

  @Column()
  titreGraphique: string;

  // --- Champs pour Graphiques Classiques ---
  // Rendez-les nullable si un graphique ne peut pas être à la fois classique et géo
  @Column({ type: "json", nullable: true }) // Rendu nullable
  colonneX: any | null; // Stocke soit la définition, soit les valeurs extraites (selon votre choix dans le service)

  @Column({ type: "json", nullable: true }) // Rendu nullable
  colonneY: any | null; // Stocke soit la définition, soit les valeurs extraites

  // --- NOUVEAUX Champs pour Graphiques Géospatiaux ---
  @Column({ type: 'json', nullable: true }) // Rendu nullable
  configGeographique: ConfigGeographique | null; // Stocke la configuration géo

  @Column({ type: 'json', nullable: true }) // Rendu nullable
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