// src/controllers/message.controller.ts
import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { MessageService } from '../services/message.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private messageService: MessageService) {}

  @Post()
  async sendMessage(
    @Body() messageDto: { senderId: string; recipientId: string; content: string }
  ) {
    return this.messageService.sendMessage(
      messageDto.senderId,
      messageDto.recipientId,
      messageDto.content
    );
  }

  @Get(':userId/:otherUserId')
  async getConversation(
    @Param('userId') userId: string,
    @Param('otherUserId') otherUserId: string
  ) {
    return this.messageService.getMessages(userId, otherUserId);
  }
}