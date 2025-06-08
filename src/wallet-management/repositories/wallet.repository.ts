import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet, WalletStatus, WalletType } from '../entities/wallet.entity';

@Injectable()
export class WalletRepository {
  constructor(
    @InjectRepository(Wallet)
    private readonly repository: Repository<Wallet>,
  ) {}

  async create(wallet: Partial<Wallet>): Promise<Wallet> {
    const newWallet = this.repository.create(wallet);
    return await this.repository.save(newWallet);
  }

  async findById(id: string): Promise<Wallet> {
    return await this.repository.findOne({ where: { id } });
  }

  async findByAddress(address: string): Promise<Wallet> {
    return await this.repository.findOne({ where: { address } });
  }

  async findByUserId(userId: string): Promise<Wallet[]> {
    return await this.repository.find({ where: { user_id: userId } });
  }

  async findPrimaryWallet(userId: string): Promise<Wallet> {
    return await this.repository.findOne({
      where: { user_id: userId, type: WalletType.PRIMARY },
    });
  }

  async update(id: string, data: Partial<Wallet>): Promise<Wallet> {
    await this.repository.update(id, data);
    return await this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async updateBalance(address: string, balance: string): Promise<Wallet> {
    const wallet = await this.findByAddress(address);
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    return await this.update(wallet.id, {
      balance,
      last_sync_at: new Date(),
    });
  }

  async findWithFilters(params: {
    userId?: string;
    status?: WalletStatus;
    type?: WalletType;
    category?: string;
    tags?: string[];
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ wallets: Wallet[]; total: number }> {
    const {
      userId,
      status,
      type,
      category,
      tags,
      search,
      page = 1,
      limit = 10,
    } = params;

    const query = this.repository.createQueryBuilder('wallet');

    if (userId) {
      query.andWhere('wallet.user_id = :userId', { userId });
    }

    if (status) {
      query.andWhere('wallet.status = :status', { status });
    }

    if (type) {
      query.andWhere('wallet.type = :type', { type });
    }

    if (category) {
      query.andWhere('wallet.category = :category', { category });
    }

    if (tags && tags.length > 0) {
      query.andWhere('wallet.tags @> :tags', { tags });
    }

    if (search) {
      query.andWhere(
        '(wallet.address ILIKE :search OR wallet.label ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [wallets, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('wallet.created_at', 'DESC')
      .getManyAndCount();

    return { wallets, total };
  }

  async getWalletStats(userId: string): Promise<{
    totalWallets: number;
    totalBalance: string;
    byStatus: Record<WalletStatus, number>;
    byType: Record<WalletType, number>;
  }> {
    const stats = await this.repository
      .createQueryBuilder('wallet')
      .select('COUNT(*)', 'totalWallets')
      .addSelect('SUM(CAST(balance AS DECIMAL))', 'totalBalance')
      .addSelect('status')
      .addSelect('type')
      .where('wallet.user_id = :userId', { userId })
      .groupBy('status')
      .addGroupBy('type')
      .getRawMany();

    return {
      totalWallets: stats.reduce((acc, curr) => acc + Number(curr.totalWallets), 0),
      totalBalance: stats.reduce((acc, curr) => acc + Number(curr.totalBalance), 0).toString(),
      byStatus: stats.reduce((acc, curr) => {
        acc[curr.status] = Number(curr.totalWallets);
        return acc;
      }, {} as Record<WalletStatus, number>),
      byType: stats.reduce((acc, curr) => {
        acc[curr.type] = Number(curr.totalWallets);
        return acc;
      }, {} as Record<WalletType, number>),
    };
  }
} 