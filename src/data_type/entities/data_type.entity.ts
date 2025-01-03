import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("datatype")
export class DataType {
    @PrimaryGeneratedColumn("increment")
        iddatatype :string;
        @Column({unique:true})
        libelledatatype : string;
    }

