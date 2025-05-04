
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { StarknetTippingService } from './starknet-tipping.service';
import { StarknetTippingController } from './starknet-tipping.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [StarknetTippingController],
  providers: [StarknetTippingService],
  exports: [StarknetTippingService],
})
export class StarknetTippingModule {}

// 2. DTOs
// src/starknet-tipping/dto/tip.dto.ts

import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';

export class TipDto {
  @IsNotEmpty()
  @IsString()
  senderAddress: string;

  @IsNotEmpty()
  @IsString()
  recipientAddress: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  amount: number;

  @IsNotEmpty()
  @IsString()
  tokenAddress: string;

  @IsString()
  signature?: string;
}
