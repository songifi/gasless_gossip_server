import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum WalletStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REVOKED = 'revoked',
}

export enum WalletType {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
}

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  address: string;

  @Column({
    type: 'enum',
    enum: WalletStatus,
    default: WalletStatus.PENDING,
  })
  status: WalletStatus;

  @Column({
    type: 'enum',
    enum: WalletType,
    default: WalletType.SECONDARY,
  })
  type: WalletType;

  @Column({ nullable: true })
  label: string;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'decimal', precision: 36, scale: 18, default: '0' })
  balance: string;

  @Column({ type: 'timestamp', nullable: true })
  last_sync_at: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  user_id: string;

  @Column({ nullable: true })
  verification_signature: string;

  @Column({ type: 'timestamp', nullable: true })
  verified_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  revoked_at: Date;

  @Column({ nullable: true })
  revocation_reason: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  last_activity_at: Date;
} 