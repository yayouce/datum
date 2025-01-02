import { etatprojetEnum } from "generique/etatprojetEnum.enum";
import { TimestampEntites } from "generique/timestamp";
import { MembreStruct } from "src/membre-struct/entities/membre-struct.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";


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

    @ManyToOne(()=>MembreStruct,(membreStruct)=>membreStruct.projet)
    membreStruct:MembreStruct

}
