export class Transfer {}

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { MessageEntity } from './chat/message.entity'; 

export enum TransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity('transactions')
export class TransferEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  messageId: string;

  @Column()
  txHash: string;

  @Column()
  tokenType: 'ERC20' | 'ERC721' | 'ERC1155';

  @Column({ nullable: true })
  tokenAddress: string;

  @Column('decimal', { precision: 18, scale: 8 })
  amount: string;

  @Column()
  recipientAddress: string;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => MessageEntity, (message) => message.transactions)
  message: MessageEntity;
}
