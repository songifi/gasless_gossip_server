import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NotificationDelivery } from './notification-delivery.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string; // e.g., 'message', 'transaction', 'wallet_added'

  @Column('jsonb')
  content: Record<string, any>; // Formatted content from templates

  @Column({ default: 'unread' })
  status: string; // 'unread', 'read', 'archived'

  @ManyToOne(() => User, user => user.notifications)
  recipient: User;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>; // Optional additional data

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => NotificationDelivery, delivery => delivery.notification)
  deliveries: NotificationDelivery[];
}