/* eslint-disable prettier/prettier */
import { IsString, IsNumber, IsOptional, IsEnum, IsArray } from 'class-validator';
import { TransactionStatus } from '../entities/transaction.entity';

export class CreateTransactionDto {
  @IsString()
  userId: string;

  @IsNumber()
  amount: number;

  @IsString()
  description: string;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}