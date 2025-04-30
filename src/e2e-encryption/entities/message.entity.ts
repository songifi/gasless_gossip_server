// src/entities/message.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  encryptedContent: string;

  @Column({ type: 'text' })
  iv: string; // Initialization Vector for AES encryption

  @ManyToOne(() => User, user => user.sentMessages)
  sender: User;

  @ManyToOne(() => User, user => user.receivedMessages)
  recipient: User;

  @Column()
  senderId: string;

  @Column()
  recipientId: string;

  @CreateDateColumn()
  createdAt: Date;
}