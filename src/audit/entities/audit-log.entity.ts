import { Field, ID, ObjectType } from '@nestjs/graphql';
import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn,
  Index
} from 'typeorm';

export enum ActionType {
  LOGIN = 'LOGIN',
  MESSAGE_SENT = 'MESSAGE_SENT',
  TRANSFER_MADE = 'TRANSFER_MADE',
}

@ObjectType()
@Entity('audit_logs')
export class AuditLog {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  @Index()
  userId: string;

  @Field()
  @Column({
    type: 'enum',
    enum: ActionType,
  })
  @Index()
  actionType: ActionType;

  @Field()
  @Column({ type: 'text' })
  description: string;

  @Field({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Field()
  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
