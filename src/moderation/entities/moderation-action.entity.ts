import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Report } from './report.entity';

@Entity('moderation_actions')
export class ModerationAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Report, (report) => report.actions)
  @JoinColumn()
  report: Report;

  @Column()
  @Index()
  reportId: string;

  @ManyToOne(() => User)
  @JoinColumn()
  moderator: User;

  @Column()
  @Index()
  moderatorId: string;

  @Column({ type: 'text' })
  action: string; // e.g., 'remove_content', 'issue_warning', etc.

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: false })
  isAutomated: boolean;
}