import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Message } from './message.entity';

@Entity('message_reads')
@Unique(['messageId', 'userId'])
export class MessageRead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  messageId: string;

  @Column()
  userId: string;

  @CreateDateColumn()
  readAt: Date;

  @ManyToOne(() => Message, (message) => message.readReceipts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'messageId' })
  message: Message;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
