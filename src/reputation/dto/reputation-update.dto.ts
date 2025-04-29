import { IsUUID, IsNumber, IsOptional, IsObject, IsString, IsBoolean } from 'class-validator';

export class ReputationUpdateDto {
  @IsUUID()
  userId: string;

  @IsNumber()
  @IsOptional()
  transactionScore?: number;

  @IsNumber()
  @IsOptional()
  activityScore?: number;

  @IsNumber()
  @IsOptional()
  socialScore?: number;

  @IsObject()
  @IsOptional()
  factorWeights?: Record<string, number>;

  @IsString()
  @IsOptional()
  level?: string;

  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;
}
