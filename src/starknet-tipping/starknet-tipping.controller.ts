import { Controller, Post, Body, Get, Param, Query, HttpStatus, HttpException } from '@nestjs/common';
import { StarknetTippingService } from './starknet-tipping.service';
import { TipDto } from './dto/tip.dto';
import { TransactionStatusDto } from './dto/transaction-status.dto';

@Controller('starknet-tipping')
export class StarknetTippingController {
  constructor(private readonly starknetTippingService: StarknetTippingService) {}

  @Post('estimate-fee')
  async estimateFee(@Body() tipDto: TipDto) {
    return this.starknetTippingService.estimateTipFee(tipDto);
  }

  @Post('execute-tip')
  async executeTip(
    @Body() tipDto: TipDto,
    @Query('callbackUrl') callbackUrl?: string,
  ) {
    return this.starknetTippingService.executeTip(tipDto, callbackUrl);
  }

  @Get('transaction/:id')
  async getTransactionStatus(@Param('id') transactionId: string) {
    return this.starknetTippingService.getTransactionStatus(transactionId);
  }

  @Post('transaction-by-hash')
  async getTransactionByHash(@Body() transactionStatusDto: TransactionStatusDto) {
    const transaction = await this.starknetTippingService.getTransactionByHash(
      transactionStatusDto.transactionHash,
    );
    
    if (!transaction) {
      throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
    }
    
    return transaction;
  }
}
