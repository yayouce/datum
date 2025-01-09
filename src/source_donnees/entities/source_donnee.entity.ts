import { DataType } from "src/data_type/entities/data_type.entity";
import { Enquete } from "src/enquete/entities/enquete.entity";
import { Formatfichier } from "src/formatfichier/entities/formatfichier.entity";
import { unitefrequence } from "src/frequence/entities/unitefrequence.entity";
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";


@Entity("sourcedonnees")
export class SourceDonnee {

    @PrimaryGeneratedColumn()
    idsourceDonnes:string

    @Column()
    typeDonnees:string

    @Column()
    nomSource:string

    @Column()
    commentaire:string

    @ManyToOne(()=>Formatfichier,(formatfichier)=>formatfichier.source)
    format:Formatfichier
    @Column()
    libelleformat:string

    @ManyToOne(()=>DataType,(DataType)=>DataType.source)
    typedonnes:DataType

    @Column()
    libelletypedonnees:string;

    @ManyToOne(()=>unitefrequence,(unitefrequence)=>unitefrequence.source)
    unitefrequence:unitefrequence
    @Column()
    libelleunite:string;
    
    @Column()
    frequence :number

    @Column({ type: 'json', nullable: true })
    fichier:any

    @Column({
        nullable:true
    })
    source:string

    @ManyToOne(()=>Enquete,(enquete)=>enquete.source)
    enquete:Enquete


}
