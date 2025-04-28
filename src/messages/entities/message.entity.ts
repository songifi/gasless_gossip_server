import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ChatRoom } from '../../chat-room/entities/chat-room.entity';
import { MessageReaction } from './message-reaction.entity';
import { MessageRead } from './message-read.entity';

export enum MessageType {
  TEXT = 'text',
  MEDIA = 'media',
  TRANSFER = 'transfer',
  SYSTEM = 'system',
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

@Entity('messages')
@Index(['chatRoomId', 'createdAt']) // For efficient chat history queries
@Index(['replyToId', 'createdAt']) // For thread queries
@Index(['senderId', 'createdAt']) // For user message history
@Index(['type', 'chatRoomId', 'createdAt']) // For filtering by message type
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({ nullable: true })
  mediaUrl: string;

  @Column({ nullable: true })
  mediaType: string;

  @Index()
  @Column()
  chatRoomId: string;

  @Index()
  @Column({ nullable: true })
  senderId: string;

  @Column({ nullable: true })
  replyToId: string;

  @Column({ default: false })
  isEdited: boolean;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.SENT,
  })
  status: MessageStatus;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.messages)
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @ManyToOne(() => ChatRoom, (chatRoom) => chatRoom.messages)
  @JoinColumn({ name: 'chatRoomId' })
  chatRoom: ChatRoom;

  @ManyToOne(() => Message, (message) => message.replies)
  @JoinColumn({ name: 'replyToId' })
  replyTo: Message;

  @OneToMany(() => Message, (message) => message.replyTo)
  replies: Message[];

  @OneToMany(() => MessageReaction, (reaction) => reaction.message)
  reactions: MessageReaction[];

  @OneToMany(() => MessageRead, (read) => read.message)
  readReceipts: MessageRead[];
}
