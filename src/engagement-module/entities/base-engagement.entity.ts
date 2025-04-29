// BASE ENTITY
// entities/base-engagement.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
  } from "typeorm";
  import { User } from "../../user/entities/user.entity";
  
  @Entity()
  export abstract class BaseEngagement {
    @PrimaryGeneratedColumn("uuid")
    id: string;
  
    @Column({ type: "uuid" })
    @Index()
    contentId: string;
  
    @Column()
    @Index()
    contentType: string;
  
    @ManyToOne(() => User, { eager: true })
    @JoinColumn()
    creator: User;
  
    @Column()
    creatorId: string;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  
    @Column({ default: false })
    isDeleted: boolean;
  }
  