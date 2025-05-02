
// src/entities/message.entity.ts
import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Chat } from './chat.entity';

@Entity('messages')
export class Message extends BaseEntity {
  @Column('text')
  content: string;
  
  @ManyToOne(() => User)
  sender: User;
  
  @ManyToOne(() => Chat, chat => chat.messages)
  chat: Chat;
}