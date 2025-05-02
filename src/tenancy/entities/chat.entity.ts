// src/entities/chat.entity.ts
import { Entity, Column, ManyToMany, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Message } from './message.entity';

@Entity('chats')
export class Chat extends BaseEntity {
  @Column()
  name: string;
  
  @Column({ default: false })
  isPrivate: boolean;
  
  @ManyToMany(() => User, user => user.chats)
  participants: User[];
  
  @OneToMany(() => Message, message => message.chat)
  messages: Message[];
}