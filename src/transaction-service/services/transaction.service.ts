import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TransactionRepository } from '../repositories/transaction.repository';
import { Transaction, TransactionStatus, TransactionType } from '../entities/transaction.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class TransactionService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createTransaction(data: Partial<Transaction>): Promise<Transaction> {
    const transaction = await this.transactionRepository.create(data);
    this.eventEmitter.emit('transaction.created', transaction);
    return transaction;
  }

  async getTransaction(id: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findById(id);
    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }
    return transaction;
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return await this.transactionRepository.findByUserId(userId);
  }

  async updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction> {
    const transaction = await this.getTransaction(id);
    const updatedTransaction = await this.transactionRepository.update(id, data);
    this.eventEmitter.emit('transaction.updated', updatedTransaction);
    return updatedTransaction;
  }

  async deleteTransaction(id: string): Promise<void> {
    const transaction = await this.getTransaction(id);
    await this.transactionRepository.delete(id);
    this.eventEmitter.emit('transaction.deleted', transaction);
  }

  async updateTransactionStatus(
    id: string,
    status: TransactionStatus,
    failureReason?: string,
  ): Promise<Transaction> {
    const transaction = await this.getTransaction(id);
    
    const updateData: Partial<Transaction> = {
      status,
      ...(status === TransactionStatus.CONFIRMED && { confirmed_at: new Date() }),
      ...(status === TransactionStatus.FAILED && {
        failed_at: new Date(),
        failure_reason: failureReason,
      }),
    };

    const updatedTransaction = await this.transactionRepository.update(id, updateData);
    this.eventEmitter.emit('transaction.status.updated', updatedTransaction);
    return updatedTransaction;
  }

  async searchTransactions(params: {
    userId?: string;
    status?: TransactionStatus;
    type?: TransactionType;
    startDate?: Date;
    endDate?: Date;
    category?: string;
    tags?: string[];
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ transactions: Transaction[]; total: number }> {
    return await this.transactionRepository.findWithFilters(params);
  }

  async getTransactionStats(userId: string): Promise<{
    totalTransactions: number;
    totalAmount: number;
    byStatus: Record<TransactionStatus, number>;
    byType: Record<TransactionType, number>;
  }> {
    return await this.transactionRepository.getTransactionStats(userId);
  }

  async exportTransactions(
    userId: string,
    format: 'csv' | 'json',
    filters?: {
      status?: TransactionStatus;
      type?: TransactionType;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<string> {
    const { transactions } = await this.searchTransactions({
      userId,
      ...filters,
      limit: 1000, // Adjust based on your needs
    });

    if (format === 'json') {
      return JSON.stringify(transactions, null, 2);
    } else if (format === 'csv') {
      const headers = [
        'ID',
        'Amount',
        'Status',
        'Type',
        'Description',
        'Reference',
        'Category',
        'Tags',
        'Created At',
        'Updated At',
      ].join(',');

      const rows = transactions.map((t) => [
        t.id,
        t.amount,
        t.status,
        t.type,
        t.description,
        t.reference,
        t.category,
        t.tags?.join(';'),
        t.created_at,
        t.updated_at,
      ].join(','));

      return [headers, ...rows].join('\n');
    }

    throw new BadRequestException('Unsupported export format');
  }
} 