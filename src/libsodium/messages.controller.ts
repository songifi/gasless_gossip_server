// messages.controller.ts
import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { MessageService } from './message.service';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messageService: MessageService) {}
  
  @Post()
  async createMessage(@Body() body: { senderId: string; recipientId: string; content: string }) {
    return this.messageService.createMessage(
      body.senderId,
      body.recipientId,
      body.content
    );
  }
  
  @Get(':userA/:userB')
  async getMessagesBetweenUsers(
    @Param('userA') userA: string,
    @Param('userB') userB: string,
  ) {
    return this.messageService.getMessagesBetweenUsers(userA, userB);
  }
}