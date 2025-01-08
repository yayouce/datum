import { SourceDonnee } from "src/source_donnees/entities/source_donnee.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";


@Entity("formatfichier")
export class Formatfichier {

    @PrimaryGeneratedColumn("uuid")
    idformat :string;
    @Column({unique:true})
    libelleFormat : string;

    @OneToMany(()=>SourceDonnee,(sourcedonnee)=>sourcedonnee.format)
    source:SourceDonnee[]

}
