import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { FilterAction } from '../interfaces/filter-action.enum';

@Entity('filter_rules')
export class FilterRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  name: string;

  @Column()
  pattern: string; // regex pattern or keyword

  @Column({ default: false })
  isRegex: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({
    type: 'enum',
    enum: FilterAction,
    default: FilterAction.FLAG,
  })
  action: FilterAction;

  @Column({
    type: 'enum',
    enum: ModerationPriority,
    default: ModerationPriority.MEDIUM,
  })
  priority: ModerationPriority;

  @Column({ default: 0 })
  score: number; // severity score

  @Column({ nullable: true })
  category: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}