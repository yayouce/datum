import { CreateDateColumn, DeleteDateColumn, UpdateDateColumn } from "typeorm";




export class TimestampEntites{
@CreateDateColumn({
    update:false //empecher d'etre modifier
})
createdAt:Date;

@UpdateDateColumn()
updatedAt:Date;

@DeleteDateColumn()
deletedAt:Date
}
