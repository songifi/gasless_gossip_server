import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('notification_templates')
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string; // e.g., 'message', 'transaction'

  @Column()
  language: string; // e.g., 'en', 'fr'

  @Column()
  subject: string; // For email notifications

  @Column('text')
  content: string; // Template with placeholders, e.g., "New wallet {{address}} added"
}