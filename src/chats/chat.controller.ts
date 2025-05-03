import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { Room } from './entities/room.entity';
import { Message } from './entities/message.entity';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('rooms')
  async createRoom(@Body() createRoomDto: CreateRoomDto): Promise<Room> {
    return this.chatService.createRoom(createRoomDto);
  }

  @Get('rooms')
  async getRooms(): Promise<Room[]> {
    return this.chatService.getRooms();
  }

  @Get('rooms/:id')
  async getRoom(@Param('id') id: string): Promise<Room> {
    return this.chatService.getRoom(id);
  }

  @Get('rooms/:id/messages')
  async getRoomMessages(@Param('id') id: string): Promise<Message[]> {
    return this.chatService.getRoomMessages(id);
  }

  @Get('rooms/:id/users')
  async getRoomUsers(@Param('id') id: string): Promise<{ userId: string; username: string }[]> {
    return this.chatService.getUsersInRoom(id);
  }
}
