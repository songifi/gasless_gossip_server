// src/users/entities/user-settings.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class UserSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, user => user.settings)
  @JoinColumn()
  user: User;

  @Column({ type: 'jsonb', default: {} })
  preferences: Record<string, any>;

  @Column({ type: 'jsonb', default: {
    messages: true,
    transfers: true,
    mentions: true
  }})
  notificationPrefs: Record<string, any>;

  @Column({ type: 'jsonb', default: {
    showWalletAddress: true,
    showTransactionHistory: false
  }})
  privacyPrefs: Record<string, any>;

  @Column({ type: 'jsonb', default: {
    darkMode: false,
    primaryColor: '#4f46e5',
    fontSize: 16
  }})
  themePrefs: Record<string, any>;

  @Column({ default: 1 })
  version: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}