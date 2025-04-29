import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('trending_topics')
export class TrendingTopic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index({ unique: true })
  topic: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  score: number;

  @Column('int', { default: 0 })
  mentionCount: number;

  @Column('int', { default: 0 })
  engagementCount: number;

  @Column('jsonb', { default: {} })
  relatedTopics: Record<string, number>;

  @Column('varchar', { array: true, default: [] })
  relevantHashtags: string[];

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
