import { SourceDonneeAction, SourceDonneeRole } from "@/generique/autorisation.enum";
import { TimestampEntites } from "@/generique/timestamp";
import { DataType } from "src/data_type/entities/data_type.entity";
import { Enquete } from "src/enquete/entities/enquete.entity";
import { Formatfichier } from "src/formatfichier/entities/formatfichier.entity";
import { unitefrequence } from "src/frequence/entities/unitefrequence.entity";
import { Graph } from "src/graph/entities/graph.entity";
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";


@Entity("sourcedonnees")
export class SourceDonnee extends TimestampEntites {

    
    @PrimaryGeneratedColumn("uuid")
    idsourceDonnes:string

    @Column( {nullable: true })
    typeDonnees:string

    @Column()
    nomSource:string

    @Column()
    commentaire:string

    @ManyToOne(()=>Formatfichier,(formatfichier)=>formatfichier.source)
    format:Formatfichier
    @Column({nullable: true })
    libelleformat:string

    @ManyToOne(()=>DataType,(DataType)=>DataType.source)
    typedonnes:DataType

    @Column({nullable: true })
    libelletypedonnees:string;

    @ManyToOne(()=>unitefrequence,(unitefrequence)=>unitefrequence.source)
    unitefrequence:unitefrequence
    @Column({nullable: true })
    libelleunite:string;
    
    @Column({nullable: true })
    frequence :number

    @Column({ type: 'json', nullable: true })
    fichier:any

    @Column({
        nullable:true
    })
    source:string


    @Column({
        default:false
    })
    inStudio:boolean

    @ManyToOne(()=>Enquete,(enquete)=>enquete.source)
    enquete:Enquete



    @Column({ type: 'json', nullable: true })
    bd_normales: any;
 
    @Column({ type: 'json', nullable: true })
    bd_jointes: any;
    @OneToMany(()=>Graph,(graph)=>graph.sources)
    graphique:Graph[]



    @Column({ type: 'json', nullable: true })
    autorisations: Record<SourceDonneeRole, Partial<Record<SourceDonneeAction, boolean>>> | null;


    @Column({ type: 'json', nullable: true })
    autorisationsUtilisateursSpecifiques: Record<string, Partial<Record<SourceDonneeAction, boolean | null>>> | null;
}

