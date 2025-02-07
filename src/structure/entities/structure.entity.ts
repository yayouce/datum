import { Projet } from "@/projet/entities/projet.entity";
import { TimestampEntites } from "src/generique/timestamp";
import { MembreStruct } from "src/membre-struct/entities/membre-struct.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm"

@Entity('structure')
export class Structure extends TimestampEntites {
  
    @PrimaryGeneratedColumn("uuid")
    idStruct :string;
    @Column({unique:true})
    nomStruct : string;
    @Column()
    descStruct : string;
    @Column({unique:true})
    contactStruct : string;
    @Column({unique:true})
    emailStruct : string;
    @Column()
    localisationStruc:string
  
  
    @OneToMany(()=>MembreStruct,(membre)=>membre.structure)
    membres:MembreStruct[]


    @OneToMany(()=>Projet,(projet)=>projet.structure)
    projet:Projet[]
}
