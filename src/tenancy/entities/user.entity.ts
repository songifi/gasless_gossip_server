
// src/entities/user.entity.ts
import { Entity, Column, ManyToMany, JoinTable } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Chat } from './chat.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;
  
  @Column()
  name: string;
  
  @Column({ select: false })
  password: string;
  
  @ManyToMany(() => Chat)
  @JoinTable()
  chats: Chat[];
}