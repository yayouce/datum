import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("datatype")
export class DataType {
    @PrimaryGeneratedColumn("uuid")
        iddatatype :string;
        @Column({unique:true})
        libelledatatype : string;
    }

