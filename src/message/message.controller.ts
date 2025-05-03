import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { MessageService, MessageDeliveryJob } from './message.service';

@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  async sendMessage(@Body() messageData: MessageDeliveryJob) {
    return this.messageService.sendMessage(messageData);
  }

  @Post(':id/read')
  async markAsRead(@Param('id') messageId: string, @Body('userId') userId: string) {
    return this.messageService.markAsRead(messageId, userId);
  }

  @Get(':id')
  async getMessageStatus(@Param('id') id: string) {
    return this.messageService.getMessageStatus(id);
  }
}
