import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { TransactionType } from '../entities/transaction.entity';

export class UpdateTransactionDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsOptional()
  metadata?: Record<string, any>;
} 