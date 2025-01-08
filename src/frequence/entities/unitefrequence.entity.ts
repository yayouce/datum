import { SourceDonnee } from "src/source_donnees/entities/source_donnee.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity("unitefrequence")
export class unitefrequence {
    @PrimaryGeneratedColumn("uuid")
        idunifie :string;
        @Column({unique:true})
        libelleunitefrequence : string;

        @OneToMany(()=>SourceDonnee,(sourcedonnee)=>sourcedonnee.unitefrequence)
        source:SourceDonnee[]


    }

