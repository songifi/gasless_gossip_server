import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { WalletRepository } from '../repositories/wallet.repository';
import { Wallet, WalletStatus, WalletType } from '../entities/wallet.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WalletService {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  async createWallet(data: Partial<Wallet>): Promise<Wallet> {
    // Validate Ethereum address
    if (!ethers.isAddress(data.address)) {
      throw new BadRequestException('Invalid Ethereum address');
    }

    // Check if wallet already exists
    const existingWallet = await this.walletRepository.findByAddress(data.address);
    if (existingWallet) {
      throw new BadRequestException('Wallet address already registered');
    }

    // If this is the first wallet for the user, set it as primary
    const userWallets = await this.walletRepository.findByUserId(data.user_id);
    if (userWallets.length === 0) {
      data.type = WalletType.PRIMARY;
    }

    const wallet = await this.walletRepository.create(data);
    this.eventEmitter.emit('wallet.created', wallet);
    return wallet;
  }

  async verifyWallet(address: string, signature: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findByAddress(address);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.status === WalletStatus.VERIFIED) {
      throw new BadRequestException('Wallet already verified');
    }

    // Verify signature
    const message = this.getVerificationMessage(address);
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      throw new BadRequestException('Invalid signature');
    }

    const updatedWallet = await this.walletRepository.update(wallet.id, {
      status: WalletStatus.VERIFIED,
      verification_signature: signature,
      verified_at: new Date(),
    });

    this.eventEmitter.emit('wallet.verified', updatedWallet);
    return updatedWallet;
  }

  async revokeWallet(id: string, reason: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findById(id);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.type === WalletType.PRIMARY) {
      throw new BadRequestException('Cannot revoke primary wallet');
    }

    const updatedWallet = await this.walletRepository.update(id, {
      status: WalletStatus.REVOKED,
      revoked_at: new Date(),
      revocation_reason: reason,
    });

    this.eventEmitter.emit('wallet.revoked', updatedWallet);
    return updatedWallet;
  }

  async setPrimaryWallet(id: string, userId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findById(id);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.user_id !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    if (wallet.status !== WalletStatus.VERIFIED) {
      throw new BadRequestException('Wallet must be verified to be set as primary');
    }

    // Update current primary wallet to secondary
    const currentPrimary = await this.walletRepository.findPrimaryWallet(userId);
    if (currentPrimary) {
      await this.walletRepository.update(currentPrimary.id, {
        type: WalletType.SECONDARY,
      });
    }

    const updatedWallet = await this.walletRepository.update(id, {
      type: WalletType.PRIMARY,
    });

    this.eventEmitter.emit('wallet.primary_changed', updatedWallet);
    return updatedWallet;
  }

  async updateWalletBalance(address: string, balance: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findByAddress(address);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const updatedWallet = await this.walletRepository.updateBalance(address, balance);
    this.eventEmitter.emit('wallet.balance_updated', updatedWallet);
    return updatedWallet;
  }

  async getWallet(id: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findById(id);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    return wallet;
  }

  async getUserWallets(userId: string): Promise<Wallet[]> {
    return await this.walletRepository.findByUserId(userId);
  }

  async searchWallets(params: {
    userId?: string;
    status?: WalletStatus;
    type?: WalletType;
    category?: string;
    tags?: string[];
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ wallets: Wallet[]; total: number }> {
    return await this.walletRepository.findWithFilters(params);
  }

  async getWalletStats(userId: string): Promise<{
    totalWallets: number;
    totalBalance: string;
    byStatus: Record<WalletStatus, number>;
    byType: Record<WalletType, number>;
  }> {
    return await this.walletRepository.getWalletStats(userId);
  }

  private getVerificationMessage(address: string): string {
    const nonce = this.generateNonce();
    return `Sign this message to verify ownership of wallet ${address}. Nonce: ${nonce}`;
  }

  private generateNonce(): string {
    return Math.random().toString(36).substring(2, 15);
  }
} 