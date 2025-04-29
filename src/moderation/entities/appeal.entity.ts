import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Penalty } from './penalty.entity';

@Entity('appeals')
export class Appeal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn()
  user: User;

  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => Penalty)
  @JoinColumn()
  penalty: Penalty;

  @Column()
  @Index()
  penaltyId: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ default: 'pending' })
  @Index()
  status: string; // 'pending', 'approved', 'rejected'

  @Column({ type: 'text', nullable: true })
  moderatorResponse: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn()
  reviewedBy: User;

  @Column({ nullable: true })
  reviewedById: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}