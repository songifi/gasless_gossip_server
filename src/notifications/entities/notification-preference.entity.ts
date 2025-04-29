import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NotificationChannel } from './notification-channel.entity';

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.notificationPreferences)
  user: User;

  @Column()
  notificationType: string; // e.g., 'message', 'transaction'

  @ManyToOne(() => NotificationChannel)
  channel: NotificationChannel;

  @Column({ default: true })
  enabled: boolean;
}