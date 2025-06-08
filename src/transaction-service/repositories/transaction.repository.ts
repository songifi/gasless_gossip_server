import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, In } from 'typeorm';
import { Transaction, TransactionStatus, TransactionType } from '../entities/transaction.entity';

@Injectable()
export class TransactionRepository {
  constructor(
    @InjectRepository(Transaction)
    private readonly repository: Repository<Transaction>,
  ) {}

  async create(transaction: Partial<Transaction>): Promise<Transaction> {
    const newTransaction = this.repository.create(transaction);
    return await this.repository.save(newTransaction);
  }

  async findById(id: string): Promise<Transaction> {
    return await this.repository.findOne({ where: { id } });
  }

  async findByUserId(userId: string): Promise<Transaction[]> {
    return await this.repository.find({ where: { user_id: userId } });
  }

  async update(id: string, data: Partial<Transaction>): Promise<Transaction> {
    await this.repository.update(id, data);
    return await this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async findWithFilters(params: {
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
    const {
      userId,
      status,
      type,
      startDate,
      endDate,
      category,
      tags,
      search,
      page = 1,
      limit = 10,
    } = params;

    const query = this.repository.createQueryBuilder('transaction');

    if (userId) {
      query.andWhere('transaction.user_id = :userId', { userId });
    }

    if (status) {
      query.andWhere('transaction.status = :status', { status });
    }

    if (type) {
      query.andWhere('transaction.type = :type', { type });
    }

    if (startDate && endDate) {
      query.andWhere({
        created_at: Between(startDate, endDate),
      });
    }

    if (category) {
      query.andWhere('transaction.category = :category', { category });
    }

    if (tags && tags.length > 0) {
      query.andWhere('transaction.tags @> :tags', { tags });
    }

    if (search) {
      query.andWhere(
        '(transaction.description ILIKE :search OR transaction.reference ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [transactions, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('transaction.created_at', 'DESC')
      .getManyAndCount();

    return { transactions, total };
  }

  async getTransactionStats(userId: string): Promise<{
    totalTransactions: number;
    totalAmount: number;
    byStatus: Record<TransactionStatus, number>;
    byType: Record<TransactionType, number>;
  }> {
    const stats = await this.repository
      .createQueryBuilder('transaction')
      .select('COUNT(*)', 'totalTransactions')
      .addSelect('SUM(amount)', 'totalAmount')
      .addSelect('status')
      .addSelect('type')
      .where('transaction.user_id = :userId', { userId })
      .groupBy('status')
      .addGroupBy('type')
      .getRawMany();

    return {
      totalTransactions: stats.reduce((acc, curr) => acc + Number(curr.totalTransactions), 0),
      totalAmount: stats.reduce((acc, curr) => acc + Number(curr.totalAmount), 0),
      byStatus: stats.reduce((acc, curr) => {
        acc[curr.status] = Number(curr.totalTransactions);
        return acc;
      }, {} as Record<TransactionStatus, number>),
      byType: stats.reduce((acc, curr) => {
        acc[curr.type] = Number(curr.totalTransactions);
        return acc;
      }, {} as Record<TransactionType, number>),
    };
  }
} 