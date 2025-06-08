import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { WalletType } from '../entities/wallet.entity';

export class CreateWalletDto {
  @IsString()
  address: string;

  @IsEnum(WalletType)
  @IsOptional()
  type?: WalletType;

  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsOptional()
  metadata?: Record<string, any>;
} 