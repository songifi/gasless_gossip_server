import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { WalletService } from '../services/wallet.service';
import { Wallet, WalletStatus, WalletType } from '../entities/wallet.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { User } from '../../users/entities/user.entity';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { CreateWalletDto, UpdateWalletDto, WalletQueryDto } from '../dto';

@Controller('wallets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  @Roles('user')
  async createWallet(
    @Body() walletData: CreateWalletDto,
    @GetUser() user: User,
  ): Promise<Wallet> {
    return await this.walletService.createWallet({
      ...walletData,
      user_id: user.id,
    });
  }

  @Post(':address/verify')
  @Roles('user')
  async verifyWallet(
    @Param('address') address: string,
    @Body('signature') signature: string,
  ): Promise<Wallet> {
    return await this.walletService.verifyWallet(address, signature);
  }

  @Put(':id/primary')
  @Roles('user')
  async setPrimaryWallet(
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<Wallet> {
    return await this.walletService.setPrimaryWallet(id, user.id);
  }

  @Put(':id/revoke')
  @Roles('user')
  async revokeWallet(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @GetUser() user: User,
  ): Promise<Wallet> {
    const wallet = await this.walletService.getWallet(id);
    if (wallet.user_id !== user.id) {
      throw new Error('Unauthorized');
    }
    return await this.walletService.revokeWallet(id, reason);
  }

  @Get(':id')
  @Roles('user')
  async getWallet(
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<Wallet> {
    const wallet = await this.walletService.getWallet(id);
    if (wallet.user_id !== user.id) {
      throw new Error('Unauthorized');
    }
    return wallet;
  }

  @Get()
  @Roles('user')
  async getUserWallets(
    @GetUser() user: User,
    @Query() query: WalletQueryDto,
  ): Promise<{ wallets: Wallet[]; total: number }> {
    return await this.walletService.searchWallets({
      userId: user.id,
      ...query,
    });
  }

  @Put(':id')
  @Roles('user')
  async updateWallet(
    @Param('id') id: string,
    @Body() updateData: UpdateWalletDto,
    @GetUser() user: User,
  ): Promise<Wallet> {
    const wallet = await this.walletService.getWallet(id);
    if (wallet.user_id !== user.id) {
      throw new Error('Unauthorized');
    }
    return await this.walletService.updateWallet(id, updateData);
  }

  @Delete(':id')
  @Roles('user')
  async deleteWallet(
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<void> {
    const wallet = await this.walletService.getWallet(id);
    if (wallet.user_id !== user.id) {
      throw new Error('Unauthorized');
    }
    if (wallet.type === WalletType.PRIMARY) {
      throw new Error('Cannot delete primary wallet');
    }
    await this.walletService.revokeWallet(id, 'Deleted by user');
  }

  @Get('stats/summary')
  @Roles('user')
  async getWalletStats(@GetUser() user: User) {
    return await this.walletService.getWalletStats(user.id);
  }
} 