import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum RecommendationType {
  PERSON = 'person',
  CONTENT = 'content',
  COMMUNITY = 'community',
}

@Entity('recommendations')
@Index(['userId', 'targetId', 'type'], { unique: true })
@Index(['userId', 'score'])
export class Recommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  targetId: string;

  @Column({
    type: 'enum',
    enum: RecommendationType,
  })
  type: RecommendationType;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  score: number;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @Column({ default: false })
  dismissed: boolean;

  @Column({ nullable: true })
  lastInteractionAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
