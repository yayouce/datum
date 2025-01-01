
import { TimestampEntites } from "generique/timestamp";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('user')
export class UserEntity extends TimestampEntites {

@PrimaryGeneratedColumn("uuid")
iduser:string;
@Column()
password:string;

@Column()
name: string;
@Column()
firstname:string;
@Column({unique:true})
email:string;
@Column({unique:true})
contact:string;}