import { SourceDonnee } from "src/source_donnees/entities/source_donnee.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity("datatype")
export class DataType {
    @PrimaryGeneratedColumn("uuid")
        iddatatype :string;
        @Column({unique:true})
        libelledatatype : string;

        @OneToMany(()=>SourceDonnee,(SourceDonnee)=>SourceDonnee.typeDonnees)
        source:SourceDonnee[]

        


    }

