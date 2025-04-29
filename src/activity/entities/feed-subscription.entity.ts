// src/activity/entities/feed-subscription.entity.ts
import { 
    Entity, PrimaryGeneratedColumn, Column, ManyToOne, 
    JoinColumn, CreateDateColumn, UpdateDateColumn, Index 
  } from 'typeorm';
  import { User } from '../../user/entities/user.entity';
  
  @Entity('feed_subscriptions')
  @Index(['subscriberId', 'publisherId', 'active'])
  export class FeedSubscription {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column({ name: 'subscriber_id' })
    subscriberId: number;
  
    @ManyToOne(() => User)
    @JoinColumn({ name: 'subscriber_id' })
    subscriber: User;
  
    @Column({ name: 'publisher_id' })
    publisherId: number;
  
    @ManyToOne(() => User)
    @JoinColumn({ name: 'publisher_id' })
    publisher: User;
  
    @Column({ default: true })
    active: boolean;
  
    @Column({ default: 1.0 })
    weight: number;
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  }