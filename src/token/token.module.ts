import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TokenService } from './token.service';
import { TokenController } from './token.controller';
import { TokenProcessor } from './token.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'token',
    }),
  ],
  controllers: [TokenController],
  providers: [TokenService, TokenProcessor],
  exports: [TokenService],
})
export class TokenModule {}
