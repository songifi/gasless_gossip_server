// src/connection/entities/connection.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index, Check } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { ConnectionStatus } from '../enums/connection-status.enum';
import { ConnectionType } from '../enums/connection-type.enum';

@Entity('connections')
@Index(['requesterId', 'addresseeId'], { unique: true })
@Check(`"requesterId" <> "addresseeId"`) // Prevent self-connections
export class Connection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  requesterId: string;

  @Column()
  @Index()
  addresseeId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  requester: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  addressee: User;

  @Column({
    type: 'enum',
    enum: ConnectionType,
    default: ConnectionType.FRIENDSHIP
  })
  type: ConnectionType;

  @Column({
    type: 'enum',
    enum: ConnectionStatus,
    default: ConnectionStatus.PENDING
  })
  status: ConnectionStatus;

  @Column({ type: 'float', default: 0 })
  strength: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: false })
  isFavorite: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}