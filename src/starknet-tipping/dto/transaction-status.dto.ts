import { IsNotEmpty, IsString } from 'class-validator';

export class TransactionStatusDto {
  @IsNotEmpty()
  @IsString()
  transactionHash: string;
}

// 3. Interfaces
// src/starknet-tipping/interfaces/transaction.interface.ts

export enum TransactionStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  ACCEPTED_ON_L2 = 'ACCEPTED_ON_L2',
  REJECTED = 'REJECTED',
  FAILED = 'FAILED',
}

export interface Transaction {
  id: string;
  hash: string;
  status: TransactionStatus;
  senderAddress: string;
  recipientAddress: string;
  amount: number;
  tokenAddress: string;
  timestamp: number;
  callbackUrl?: string;
}
