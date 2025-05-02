// message.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  senderId: string;
  
  @Column()
  recipientId: string;
  
  @Column('text')
  content: string; // This will store the encrypted content
  
  @Column()
  createdAt: Date;
}