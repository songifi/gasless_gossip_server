import { Injectable, Inject } from '@nestjs/common';
import { ReputationFactor } from '../interfaces/reputation-factor.interface';

@Injectable()
export class TransactionFactorService implements ReputationFactor {
  name = 'transaction';
  weight = 0.4;

  constructor(
    @Inject('TRANSACTION_SERVICE') private transactionService: any,
  ) {}

  async calculate(userId: string): Promise<number> {
    // Get transaction metrics from transaction service
    const metrics = await this.transactionService.getUserMetrics(userId);
    
    // Calculate raw score based on transaction metrics
    let rawScore = 0;
    
    // Number of successful transactions
    rawScore += metrics.successfulTransactions * 2;
    
    // Transaction volume (normalized)
    rawScore += Math.min(metrics.totalVolume / 1000, 50);
    
    // Transaction consistency
    rawScore += metrics.averageTransactionsPerMonth * 0.5;
    
    // Transaction diversity (different transaction types)
    rawScore += metrics.transactionTypeCount * 5;
    
    // Negative factors
    rawScore -= metrics.disputedTransactions * 10;
    rawScore -= metrics.cancelledTransactions * 2;
    
    return this.normalize(rawScore);
  }

  normalize(score: number): number {
    // Normalize to 0-100 scale
    return Math.min(100, Math.max(0, score));
  }
}
