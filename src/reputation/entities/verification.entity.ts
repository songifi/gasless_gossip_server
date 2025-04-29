import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Reputation } from './reputation.entity';

@Entity('verification')
export class Verification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  reputationId: string;

  @ManyToOne(() => Reputation, reputation => reputation.verifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reputationId' })
  reputation: Reputation;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  type: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  blockchainReference: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  verificationProof: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
