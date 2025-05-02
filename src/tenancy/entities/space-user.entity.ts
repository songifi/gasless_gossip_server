
// src/entities/space-user.entity.ts
import { Entity, Column, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Space } from './space.entity';
import { User } from './user.entity';

@Entity('space_users')
export class SpaceUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @ManyToOne(() => Space, space => space.members)
  space: Space;
  
  @ManyToOne(() => User)
  user: User;
  
  @Column()
  role: 'admin' | 'member' | 'guest';
  
  @CreateDateColumn()
  joinedAt: Date;
}