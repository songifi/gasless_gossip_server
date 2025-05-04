import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { TipDto } from './dto/tip.dto';
import { StarknetUtils, TransactionStatus } from './utils/starknet.utils';
import { Transaction } from './interfaces/transaction.interface';

@Injectable()
export class StarknetTippingService {
  private readonly logger = new Logger(StarknetTippingService.name);
  private readonly starknetUtils: StarknetUtils;
  private transactions: Map<string, Transaction> = new Map();

  constructor(private configService: ConfigService) {
    const providerUrl = this.configService.get<string>('STARKNET_PROVIDER_URL');
    const accountAddress = this.configService.get<string>('STARKNET_ACCOUNT_ADDRESS');
    const privateKey = this.configService.get<string>('STARKNET_PRIVATE_KEY');

    if (!providerUrl || !accountAddress || !privateKey) {
      this.logger.error('Missing Starknet configuration');
      throw new Error('Missing Starknet configuration');
    }

    this.starknetUtils = new StarknetUtils(providerUrl, accountAddress, privateKey);
  }

  async estimateTipFee(tipDto: TipDto): Promise<{ fee: string }> {
    try {
      const fee = await this.starknetUtils.estimateFee(
        tipDto.tokenAddress,
        tipDto.senderAddress,
        tipDto.recipientAddress,
        tipDto.amount,
      );
      
      return { fee: fee.toString() };
    } catch (error) {
      this.logger.error(⁠ Error estimating fee: ${error.message} ⁠);
      throw new HttpException('Failed to estimate transaction fee', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async executeTip(tipDto: TipDto, callbackUrl?: string): Promise<{ transactionId: string, transactionHash: string }> {
    try {
      // Verify signature if provided
      if (tipDto.signature) {
        const message = ⁠ ${tipDto.senderAddress}:${tipDto.recipientAddress}:${tipDto.amount}:${tipDto.tokenAddress} ⁠;
        const isValid = await this.starknetUtils.verifySignature(
          tipDto.senderAddress,
          message,
          tipDto.signature,
        );

        if (!isValid) {
          throw new HttpException('Invalid signature', HttpStatus.BAD_REQUEST);
        }
      }

      // Execute the transaction
      const transactionHash = await this.starknetUtils.executeTip(
        tipDto.tokenAddress,
        tipDto.senderAddress,
        tipDto.recipientAddress,
        tipDto.amount,
      );

      // Store transaction information
      const transactionId = uuidv4();
      const transaction: Transaction = {
        id: transactionId,
        hash: transactionHash,
        status: TransactionStatus.PENDING,
        senderAddress: tipDto.senderAddress,
        recipientAddress: tipDto.recipientAddress,
        amount: tipDto.amount,
        tokenAddress: tipDto.tokenAddress,
        timestamp: Date.now(),
        callbackUrl,
      };

      this.transactions.set(transactionId, transaction);

      return {
        transactionId,
        transactionHash,
      };
    } catch (error) {
      this.logger.error(⁠ Error executing tip: ${error.message} ⁠);
      throw new HttpException(
        ⁠ Failed to execute tip: ${error.message} ⁠,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTransactionStatus(transactionId: string): Promise<Transaction> {
    const transaction = this.transactions.get(transactionId);
    
    if (!transaction) {
      throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
    }

    // Only check status if it's still pending
    if (transaction.status === TransactionStatus.PENDING) {
      const currentStatus = await this.starknetUtils.getTransactionStatus(transaction.hash);
      
      if (currentStatus !== transaction.status) {
        transaction.status = currentStatus;
        this.transactions.set(transactionId, transaction);
        
        // If transaction is finalized, trigger callback
        if (
          currentStatus === TransactionStatus.ACCEPTED ||
          currentStatus === TransactionStatus.ACCEPTED_ON_L2 ||
          currentStatus === TransactionStatus.REJECTED ||
          currentStatus === TransactionStatus.FAILED
        ) {
          this.triggerCallback(transaction);
        }
      }
    }

    return transaction;
  }

  async getTransactionByHash(transactionHash: string): Promise<Transaction | undefined> {
    for (const transaction of this.transactions.values()) {
      if (transaction.hash === transactionHash) {
        return transaction;
      }
    }
    return undefined;
  }

  private async triggerCallback(transaction: Transaction): Promise<void> {
    if (!transaction.callbackUrl) {
      return;
    }

    try {
      await axios.post(transaction.callbackUrl, {
        transactionId: transaction.id,
        transactionHash: transaction.hash,
        status: transaction.status,
        senderAddress: transaction.senderAddress,
        recipientAddress: transaction.recipientAddress,
        amount: transaction.amount,
        tokenAddress: transaction.tokenAddress,
        timestamp: transaction.timestamp,
      });
      this.logger.log(⁠ Callback triggered for transaction: ${transaction.id} ⁠);
    } catch (error) {
      this.logger.error(⁠ Failed to trigger callback for transaction ${transaction.id}: ${error.message} ⁠);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkPendingTransactions() {
    this.logger.debug('Checking pending transactions');
    
    for (const [transactionId, transaction] of this.transactions.entries()) {
      if (transaction.status === TransactionStatus.PENDING) {
        try {
          await this.getTransactionStatus(transactionId);
        } catch (error) {
          this.logger.error(⁠ Error checking transaction ${transactionId}: ${error.message} ⁠);
        }
      }
    }
  }
}
