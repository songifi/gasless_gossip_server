import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ChatRoomService } from './provider/chat-room.service'; // Updated path
import { CreateRoomDto } from './dto/create-room.dto'; // Updated path
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from './guards/roles.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('chat-room')
@Controller('chat-room')
@ApiBearerAuth()
export class ChatRoomController {
  constructor(private readonly chatRoomService: ChatRoomService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a new chat room' })
  @ApiResponse({ status: 201, description: 'Chat room created' })
  create(@Request() req, @Body() createChatRoomDto: CreateRoomDto) {
    return this.chatRoomService.create(createChatRoomDto, req.user.id);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiOperation({ summary: 'Get all chat rooms' })
  @ApiResponse({ status: 200, description: 'List of chat rooms' })
  findAll(@Request() req) {
    return this.chatRoomService.findAll(req.user.id);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiOperation({ summary: 'Get a chat room by ID' })
  @ApiResponse({ status: 200, description: 'Chat room details' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.chatRoomService.findOne(id, req.user.id);
  }
}