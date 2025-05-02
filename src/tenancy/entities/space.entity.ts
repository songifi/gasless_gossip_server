// src/entities/space.entity.ts
import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { SpaceUser } from './space-user.entity';

@Entity('spaces')
export class Space {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  name: string;
  
  @Column({ default: false })
  isPersonal: boolean;
  
  @Column({ nullable: true })
  ownerId: string;
  
  @OneToMany(() => SpaceUser, spaceUser => spaceUser.space)
  members: SpaceUser[];
  
  @CreateDateColumn()
  createdAt: Date;
  
  @UpdateDateColumn() 
  updatedAt: Date;
}