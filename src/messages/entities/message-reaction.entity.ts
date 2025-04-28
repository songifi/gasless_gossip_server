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

@Entity('message_reactions')
@Unique(['messageId', 'userId', 'reaction'])
export class MessageReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  messageId: string;

  @Column()
  userId: string;

  @Column()
  reaction: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Message, (message) => message.reactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'messageId' })
  message: Message;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
