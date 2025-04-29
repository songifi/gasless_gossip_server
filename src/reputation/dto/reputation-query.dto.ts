import { IsOptional, IsUUID, IsString, IsBoolean, IsDateString } from 'class-validator';

export class ReputationQueryDto {
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  level?: string;

  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
