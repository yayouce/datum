import { TimestampEntites } from "generique/timestamp";
import { typegraphiqueEnum } from "generique/typegraphique.enum";
import { SourceDonnee } from "src/source_donnees/entities/source_donnee.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity("graph")
export class Graph extends TimestampEntites {
  @PrimaryGeneratedColumn("uuid")
  idgraph: string;

  @Column({ type: "enum", enum: typegraphiqueEnum })
  typeGraphique: string;

  @Column()
  titreGraphique: string;

  @Column({type:"json"})
  colonneX: { colonne: string; nomFeuille?: string | null }[];

  @Column({ type: "json" })
  colonneY: { colonne: string; formule?: string; nomFeuille?: string | null }[];

  @Column()
  nomsourceDonnees: string;

  @ManyToOne(() => SourceDonnee, (sourcedonnee) => sourcedonnee.graphique)
  @JoinColumn({ name: "sourcesIdsourceDonnes" })
  sources: SourceDonnee;

  @Column({ type: "uuid", nullable: true })
  sourcesIdsourceDonnes: string;
}
