import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Wallet } from './wallet.entity';

@Entity()
export class WalletActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  action: string; // e.g., 'added', 'verified', 'removed'

  @Column()
  timestamp: Date;

  @ManyToOne(() => Wallet, (wallet) => wallet.activities)
  wallet: Wallet;
}