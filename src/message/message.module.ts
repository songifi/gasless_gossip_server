import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { MessageProcessor } from './message.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'message',
    }),
  ],
  controllers: [MessageController],
  providers: [MessageService, MessageProcessor],
  exports: [MessageService],
})
export class MessageModule {}
 ⁠
