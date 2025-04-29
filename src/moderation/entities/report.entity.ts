import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    JoinColumn,
  } from 'typeorm';
  import { User } from '../../user/entities/user.entity';
  import { ModerationAction } from './moderation-action.entity';
  import { ReportStatus } from '../interfaces/report-status.enum';
  import { ModerationPriority } from '../interfaces/moderation-priority.enum';
  
  @Entity('reports')
  export class Report {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column()
    @Index()
    contentType: string; // e.g., 'post', 'comment', 'message'
  
    @Column()
    @Index()
    contentId: string;
  
    @Column({
      type: 'enum',
      enum: ReportStatus,
      default: ReportStatus.PENDING,
    })
    @Index()
    status: ReportStatus;
  
    @Column({
      type: 'enum',
      enum: ModerationPriority,
      default: ModerationPriority.MEDIUM,
    })
    @Index()
    priority: ModerationPriority;
  
    @Column()
    category: string; // e.g., 'harassment', 'spam', 'inappropriate'
  
    @Column({ type: 'text', nullable: true })
    description: string;
  
    @ManyToOne(() => User)
    @JoinColumn()
    reporter: User;
  
    @Column()
    @Index()
    reporterId: string;
  
    @ManyToOne(() => User)
    @JoinColumn()
    reported: User;
  
    @Column()
    @Index()
    reportedId: string;
  
    @OneToMany(() => ModerationAction, (action) => action.report)
    actions: ModerationAction[];
  
    @CreateDateColumn()
    @Index()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  
    @Column({ default: false })
    isAutomated: boolean;
}
  