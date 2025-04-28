import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Wallet } from './wallet.entity';

@Entity()
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  txHash: string;

  @Column()
  amount: string;

  @Column()
  type: string; // e.g., 'send', 'receive'

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions)
  wallet: Wallet;
}