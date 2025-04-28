import { Module } from '@nestjs/common';
import { TransferService } from './transfers.service';
import { TransfersController } from './transfers.controller';

@Module({
  controllers: [TransfersController],
  providers: [TransfersService],
})
export class TransfersModule {}
