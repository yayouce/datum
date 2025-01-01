import { roleMembre } from "generique/rolemembre.enum";
import { Structure } from "src/structure/entities/structure.entity";
import { UserEntity } from "src/user/entities/user.entity";
import { Column, Entity, ManyToOne } from "typeorm";

@Entity("membrestruct")
export class 
MembreStruct extends UserEntity {

    @Column({
        type:"enum",
        enum:roleMembre,
    })
    roleMembre:string



    @ManyToOne(()=>Structure,(structure)=>structure.membres)
    structure:Structure;
}
