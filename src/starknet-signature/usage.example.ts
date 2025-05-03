import { Module } from '@nestjs/common';
import { StarknetSignatureModule } from './starknet-signature.module';
import { StarknetWsGateway } from './starknet-ws.gateway';
import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller('protected')
export class ProtectedController {
  @Get()
  getProtectedData(@Req() req: Request) {
    // The request has already been verified by the middleware
    const publicKey = req['starknetPublicKey'];
    return {
      message: 'This is protected data',
      verifiedPublicKey: publicKey
    };
  }
}

@Module({
  imports: [StarknetSignatureModule],
  controllers: [ProtectedController],
  providers: [StarknetWsGateway],
})
export class AppModule {}
