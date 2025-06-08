import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { TransactionType } from '../entities/transaction.entity';

export class CreateTransactionDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(TransactionType)
  type: TransactionType;

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