// src/transfer/transfer.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ParsedTransferCommand } from '../tenancy/entities/chat/utils/command-parser';
import { TransactionStatus, TransactionEntity } from '../transfers/entities/transfer.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TransferService {
  chatService: any;
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepo: Repository<TransactionEntity>,
  ) {}

  async initiateTransfer(command: ParsedTransferCommand, messageId: string): Promise<TransactionEntity> {
  

    // Dummy send function to simulate
    const txHash = await this.sendToStarkNet(command);

    const transaction = this.transactionRepo.create({
      messageId,
      txHash,
      tokenType: command.tokenType,
      tokenAddress: command.tokenAddress || '',
      amount: command.amount,
      recipientAddress: command.recipient,
      status: TransactionStatus.PENDING,
    });

    return this.transactionRepo.save(transaction);
  }

  // src/transfer/transfer.service.ts (inside a method)

async handleSuccessfulTransfer(transaction: TransactionEntity): Promise<void> {
  transaction.status = TransactionStatus.SUCCESS;
  await this.transactionRepo.save(transaction);

  
  const receiptMessage = `✅ You sent ${transaction.amount} ${transaction.tokenType} to ${transaction.recipientAddress}. [Tx Hash: ${transaction.txHash}]`;

  // Assuming you have a ChatService
  await this.chatService.createSystemMessage(transaction.messageId, receiptMessage);
}

  private async sendToStarkNet(command: ParsedTransferCommand): Promise<string> {
    // Integrate StarkNet wallet/send functions here
    return '0xDummyTransactionHash'; // Simulated transaction hash
  }
}
