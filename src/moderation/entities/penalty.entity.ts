import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { PenaltyType } from '../interfaces/penalty-type.enum';

@Entity('penalties')
export class Penalty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn()
  user: User;

  @Column()
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: PenaltyType,
  })
  @Index()
  type: PenaltyType;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // For storing additional details

  @Column({ nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn()
  issuedBy: User;

  @Column()
  @Index()
  issuedById: string;

  @Column({ default: false })
  isActive: boolean;

  @Column({ default: false })
  isAutomated: boolean;
}