import { TimestampEntites } from "@/generique/timestamp"
import { etatprojetEnum } from "src/generique/etatprojetEnum.enum"
import { MembreStruct } from "src/membre-struct/entities/membre-struct.entity"
import { Projet } from "src/projet/entities/projet.entity"
import { SourceDonnee } from "src/source_donnees/entities/source_donnee.entity"
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm"


@Entity('enquete')
export class Enquete extends TimestampEntites {
    
        @PrimaryGeneratedColumn('uuid')
        idenquete : string
        @Column()
        libelleEnquete:string
        @Column()
        commentaireEnquete:string
        @Column({type:"date"})
        dateDebut: Date
        @Column({type:"date"})
        dateFin: Date
        @Column({
            type:"enum",
            enum:etatprojetEnum
    
        })
        etatEnquete:string
        @Column()
        nomStructure:string
    
        // @ManyToOne(()=>MembreStruct,(membreStruct)=>membreStruct.enquete)
        // membreStruct:MembreStruct

        @ManyToOne(()=>Projet,(membreStruct)=>membreStruct.enquete)
        projet:Projet

        @OneToMany(()=>SourceDonnee,(SourceDonnee)=>SourceDonnee.source)
        source:SourceDonnee[]

}
