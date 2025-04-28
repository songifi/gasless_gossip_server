import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyWalletDto {
  @IsString()
  @IsNotEmpty()
  signature: string;
}