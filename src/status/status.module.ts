import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { StatusController } from './status.controller';
import { StatusService } from './status.service';
import { StatusGateway } from './status.gateway';
import { StatusProcessor } from './status.processor';
import { MessageRecipient } from '../messages/entities/message-recipient.entity';
import { StatusUpdate } from '../messages/entities/status-update.entity';
import { BullQueueConfig, StatusQueueConfig } from '../config/queue.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([MessageRecipient, StatusUpdate]),
    BullQueueConfig,
    StatusQueueConfig,
  ],
  controllers: [StatusController],
  providers: [StatusService, StatusGateway, StatusProcessor],
  exports: [StatusService, StatusGateway],
})
export class StatusModule {}
