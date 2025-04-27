import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ethers } from 'ethers';
import { Wallet } from './entities/wallet.entity';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { EmailService } from '../../common/services/email.service';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    private emailService: EmailService,
  ) {}

  async verifyWalletSignature(address: string, signature: string, message: string): Promise<boolean> {
    try {
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      return false;
    }
  }

  async addWalletWithConfirmation(dto: CreateWalletDto, userId: string): Promise<Wallet> {
    const wallet = this.walletRepository.create({ ...dto, userId, status: 'pending' });
    await this.walletRepository.save(wallet);
    await this.emailService.sendConfirmation(userId, wallet.id);
    return wallet;
  }

  async setPrimaryWallet(userId: string, walletId: string): Promise<void> {
    await this.walletRepository.update({ userId, primary: true }, { primary: false });
    await this.walletRepository.update({ id: walletId, userId }, { primary: true });
  }

  async updateWallet(id: string, updateWalletDto: UpdateWalletDto): Promise<Wallet> {
    await this.walletRepository.update(id, updateWalletDto);
    return this.walletRepository.findOneOrFail({ where: { id } });
  }
}