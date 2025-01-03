import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";


@Entity("formatfichier")
export class Formatfichier {

@PrimaryGeneratedColumn("increment")
    idformat :string;
    @Column({unique:true})
    libelleFormat : string;

}
