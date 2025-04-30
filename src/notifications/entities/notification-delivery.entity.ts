import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Notification } from './notification.entity';
import { NotificationChannel } from './notification-channel.entity';

@Entity('notification_deliveries')
export class NotificationDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Notification, notification => notification.deliveries)
  notification: Notification;

  @ManyToOne(() => NotificationChannel)
  channel: NotificationChannel;

  @Column({ default: 'pending' })
  status: string; // 'pending', 'sent', 'delivered', 'failed'

  @Column({ default: 0 })
  attempts: number;

  @Column({ nullable: true })
  lastAttemptAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}