import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("unitefrequence")
export class unitefrequence {
    @PrimaryGeneratedColumn("increment")
        idunifie :string;
        @Column({unique:true})
        libelleunitefrequence : string;
    }

