import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { TokenService, TokenTransferJob } from './token.service';

@Controller('tokens')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Post('transfer')
  async createTransfer(@Body() transferData: TokenTransferJob) {
    return this.tokenService.initiateTransfer(transferData);
  }

  @Get('transfer/:id')
  async getTransferStatus(@Param('id') id: string) {
    return this.tokenService.checkTransferStatus(id);
  }
}
