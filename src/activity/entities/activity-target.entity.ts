 // src/activity/entities/activity-target.entity.ts
 import { 
    Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index 
  } from 'typeorm';
  import { Activity } from './activity.entity';
  import { TargetType } from '../enums/target-type.enum';
  
  @Entity('activity_targets')
  @Index(['target_type', 'target_id'])
  export class ActivityTarget {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column({ name: 'activity_id' })
    activityId: string;
  
    @ManyToOne(() => Activity, activity => activity.targets, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'activity_id' })
    activity: Activity;
  
    @Column({ type: 'enum', enum: TargetType, name: 'target_type' })
    targetType: TargetType;
  
    @Column({ name: 'target_id' })
    targetId: number;
  }