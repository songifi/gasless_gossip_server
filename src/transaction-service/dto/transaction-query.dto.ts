import { IsEnum, IsOptional, IsString, IsNumber, Min, IsDateString, IsArray } from 'class-validator';
import { TransactionStatus, TransactionType } from '../entities/transaction.entity';
import { Type } from 'class-transformer';

export class TransactionQueryDto {
  @IsEnum(TransactionStatus)
  @IsOptional()
  status?: TransactionStatus;

  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

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