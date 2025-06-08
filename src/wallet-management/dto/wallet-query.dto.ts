import { IsEnum, IsOptional, IsString, IsNumber, Min, IsArray } from 'class-validator';
import { WalletStatus, WalletType } from '../entities/wallet.entity';
import { Type } from 'class-transformer';

export class WalletQueryDto {
  @IsEnum(WalletStatus)
  @IsOptional()
  status?: WalletStatus;

  @IsEnum(WalletType)
  @IsOptional()
  type?: WalletType;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  search?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;
} 