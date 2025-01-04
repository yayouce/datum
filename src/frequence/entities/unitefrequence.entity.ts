import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("unitefrequence")
export class unitefrequence {
    @PrimaryGeneratedColumn("uuid")
        idunifie :string;
        @Column({unique:true})
        libelleunitefrequence : string;
    }

