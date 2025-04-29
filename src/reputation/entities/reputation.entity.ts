import { User } from '../../user/entities/user.entity';
import { ReputationHistory } from './reputation-history.entity';
import { Verification } from './verification.entity';

@Entity('reputation')
export class Reputation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'float', default: 0 })
  score: number;

  @Column({ type: 'float', default: 0 })
  transactionScore: number;

  @Column({ type: 'float', default: 0 })
  activityScore: number;

  @Column({ type: 'float', default: 0 })
  socialScore: number;

  @Column({ type: 'jsonb', default: {} })
  factorWeights: Record<string, number>;

  @Column({ type: 'varchar', length: 50, default: 'NEWCOMER' })
  @Index()
  level: string;

  @Column({ type: 'boolean', default: false })
  @Index()
  isVerified: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastCalculated: Date;

  @OneToMany(() => ReputationHistory, history => history.reputation)
  history: ReputationHistory[];

  @OneToMany(() => Verification, verification => verification.reputation)
  verifications: Verification[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
