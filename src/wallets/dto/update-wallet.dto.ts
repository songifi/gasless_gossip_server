import { IsString, IsOptional } from 'class-validator';

export class UpdateWalletDto {
  @IsString()
  @IsOptional()
  address?: string;
}