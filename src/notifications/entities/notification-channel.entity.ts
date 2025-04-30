import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('notification_channels')
export class NotificationChannel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // e.g., 'in-app', 'email', 'push', 'webhook', 'blockchain'

  @Column()
  description: string;
}