import { etatprojetEnum } from "src/generique/etatprojetEnum.enum";
import { TimestampEntites } from "src/generique/timestamp";
import { Enquete } from "src/enquete/entities/enquete.entity";
import { MembreStruct } from "src/membre-struct/entities/membre-struct.entity";
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Structure } from "@/structure/entities/structure.entity";


@Entity('projet')
export class Projet extends TimestampEntites {

    
    @PrimaryGeneratedColumn('uuid')
    idprojet : string
    @Column()
    libelleprojet:string
    @Column()
    descprojet:string
    @Column({type:"date"})
    dateDebut: Date
    @Column({type:"date"})
    dateFin: Date
    @Column({
        type:"enum",
        enum:etatprojetEnum

    })
    etatprojet:string
    @Column()
    nomStructure:string

    // @ManyToOne(()=>MembreStruct,(membreStruct)=>membreStruct.projet)
    // membreStruct:MembreStruct

    @ManyToOne(()=>Structure,(structure)=>structure.projet)
    structure:Structure

    @OneToMany(()=>Enquete,(membreStruct)=>membreStruct.projet)
    enquete:Enquete[]

}
