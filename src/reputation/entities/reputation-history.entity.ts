import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn } from 'typeorm';
import { Reputation } from './reputation.entity';

@Entity('reputation_history')
export class ReputationHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  reputationId: string;

  @ManyToOne(() => Reputation, reputation => reputation.history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reputationId' })
  reputation: Reputation;

  @Column({ type: 'float' })
  score: number;

  @Column({ type: 'float' })
  transactionScore: number;

  @Column({ type: 'float' })
  activityScore: number;

  @Column({ type: 'float' })
  socialScore: number;

  @Column({ type: 'varchar', length: 50 })
  level: string;

  @Column({ type: 'jsonb', nullable: true })
  changeFactors: Record<string, any>;

  @CreateDateColumn()
  @Index()
  recordedAt: Date;
}
