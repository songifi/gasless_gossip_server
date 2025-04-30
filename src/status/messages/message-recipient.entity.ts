import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Message } from './message.entity';
import { User } from '../../users/entities/user.entity';
import { StatusUpdate } from './status-update.entity';

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

@Entity('message_recipients')
export class MessageRecipient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'message_id', type: 'uuid' })
  messageId: string;

  @Column({ name: 'recipient_id', type: 'uuid' })
  recipientId: string;

  @Column({
    type: 'varchar',
    default: MessageStatus.SENT,
    enum: MessageStatus,
  })
  status: MessageStatus;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @ManyToOne(() => Message, message => message.recipients)
  message: Message;

  @ManyToOne(() => User)
  recipient: User;

  @OneToMany(() => StatusUpdate, statusUpdate => statusUpdate.messageRecipient)
  statusUpdates: StatusUpdate[];
}
