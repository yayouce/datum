import { TimestampEntites } from "generique/timestamp"
import { typegraphiqueEnum } from "generique/typegraphique.enum"
import { SourceDonnee } from "src/source_donnees/entities/source_donnee.entity"
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm"



@Entity("graph")
export class Graph extends TimestampEntites {
    @PrimaryGeneratedColumn("uuid")
    idgraph: string;

    @Column({ type: "enum", enum: typegraphiqueEnum })
    typeGraphique: string;

    @Column()
    titreGraphique: string;

    @Column()
    colonneX: string;

    @Column({ type: "json" })
    colonneY: string[];

    @Column({ type: "json", nullable: true })
    formule: string[];

    @ManyToOne(() => SourceDonnee, (sourcedonnee) => sourcedonnee.graphique)
    @JoinColumn({ name: "sourcesIdsourceDonnes" }) // Explicitly define the foreign key column
    sources: SourceDonnee;

    @Column({ type: "uuid", nullable: true }) // Ensure the column type matches the referenced column
    sourcesIdsourceDonnes: string;
}
