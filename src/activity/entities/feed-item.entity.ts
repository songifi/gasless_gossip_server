 // src/activity/entities/feed-item.entity.ts
 import { 
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, 
    ManyToOne, JoinColumn, Index, Unique 
  } from 'typeorm';
  import { User } from '../../user/entities/user.entity';
  import { Activity } from './activity.entity';
  
  @Entity('feed_items')
  @Unique(['userId', 'activityId']) // Prevent duplicate feed items
  @Index(['userId', 'score', 'createdAt']) // Index for efficient feed retrieval
  export class FeedItem {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column({ name: 'user_id' })
    userId: number;
  
    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;
  
    @Column({ name: 'activity_id' })
    activityId: string;
  
    @ManyToOne(() => Activity)
    @JoinColumn({ name: 'activity_id' })
    activity: Activity;
  
    @Column('float')
    score: number;
  
    @Column({ default: false })
    read: boolean;
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  }
  