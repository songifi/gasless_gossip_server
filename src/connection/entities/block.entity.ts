
// src/connection/entities/block.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index, Check } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('blocks')
@Index(['userId', 'blockedId'], { unique: true })
@Check(`"userId" <> "blockedId"`) // Prevent self-blocks
export class Block {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  @Index()
  blockedId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  blocked: User;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @CreateDateColumn()
  createdAt: Date;
}