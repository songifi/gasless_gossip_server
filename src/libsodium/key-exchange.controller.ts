// key-exchange.controller.ts
import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import * as sodium from 'libsodium-wrappers';

@Controller('key-exchange')
export class KeyExchangeController {
  constructor(private readonly cryptoService: CryptoService) {}
  
  @Get('server-public-key')
  async getServerPublicKey() {
    await sodium.ready;
    return {
      publicKey: sodium.to_base64(this.cryptoService.getServerPublicKey())
    };
  }
  
  @Post(':userId')
  async registerClientPublicKey(
    @Param('userId') userId: string,
    @Body() body: { publicKey: string }
  ) {
    await sodium.ready;
    const publicKeyBytes = sodium.from_base64(body.publicKey);
    this.cryptoService.storeClientPublicKey(userId, publicKeyBytes);
    
    return { success: true };
  }
}