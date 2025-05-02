
// src/chat/chat.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SpaceAccessGuard } from '../space/space-access.guard';
import { User } from '../decorators/user.decorator';

@Controller('spaces/:spaceId/chats')
@UseGuards(JwtAuthGuard, SpaceAccessGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post()
  async createChat(
    @Body() createChatDto: CreateChatDto,
    @User('id') userId: string,
  ) {
    return this.chatService.createChat(createChatDto, userId);
  }

  @Get()
  async getChats() {
    return this.chatService.getChats();
  }

  @Get(':id')
  async getChatById(@Param('id') id: string) {
    return this.chatService.getChatById(id);
  }
}