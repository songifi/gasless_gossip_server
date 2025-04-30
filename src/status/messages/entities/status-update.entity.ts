import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { MessageRecipient, MessageStatus } from './message-recipient.entity';

@Entity('status_updates')
export class StatusUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'message_recipient_id', type: 'uuid' })
  messageRecipientId: string;

  @Column({
    name: 'previous_status',
    type: 'varchar',
    enum: MessageStatus,
  })
  previousStatus: MessageStatus;

  @Column({
    name: 'new_status',
    type: 'varchar',
    enum: MessageStatus,
  })
  newStatus: MessageStatus;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => MessageRecipient, messageRecipient => messageRecipient.statusUpdates)
  messageRecipient: MessageRecipient;
}
