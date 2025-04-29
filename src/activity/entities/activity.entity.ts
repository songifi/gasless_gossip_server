// src/activity/entities/activity.entity.ts
import { 
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, 
    UpdateDateColumn, ManyToOne, OneToMany, Index, JoinColumn 
  } from 'typeorm';
  import { User } from '../../user/entities/user.entity';
  import { ActivityTarget } from './activity-target.entity';
  import { ActivityType } from '../enums/activity-type.enum';
  
  @Entity('activities')
  @Index(['actor_id', 'created_at'])
  @Index(['is_public', 'created_at'], { where: 'is_public = true' }) // Partial index for public activities
  export class Activity {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ type: 'enum', enum: ActivityType })
    type: ActivityType;
  
    @Column({ name: 'actor_id' })
    actorId: number;
  
    @ManyToOne(() => User)
    @JoinColumn({ name: 'actor_id' })
    actor: User;
  
    @Column({ type: 'jsonb', nullable: true })
    payload: Record<string, any>;
  
    @Column({ default: true })
    is_public: boolean;
  
    @Column({ nullable: true })
    group_key: string;
  
    @Column({ default: 0 })
    aggregation_count: number;
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  
    @OneToMany(() => ActivityTarget, target => target.activity, { cascade: true })
    targets: ActivityTarget[];
  }
 