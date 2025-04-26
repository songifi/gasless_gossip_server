import { Controller, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UpdateRoomDto } from './dto/update-room.dto';
// import { AuthGuard } from '../auth/auth.guard'; 
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { ChatRoomService } from './provider/chat-room.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreateRoomDto } from './dto/create-room.dto';

@ApiTags('Chat Rooms')
@ApiBearerAuth()
@Controller('chat-rooms')
export class ChatRoomController {
  constructor(private readonly chatRoomService: ChatRoomService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create a new chat room' })
  create(@Body() createRoomDto: CreateRoomDto) {
    return this.chatRoomService.createRoom(createRoomDto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update chat room metadata' })
  updateRoom(@Param('id') roomId: string, @Body() dto: UpdateRoomDto) {
    return this.chatRoomService.updateRoom(roomId, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete (archive) a chat room' })
  deleteRoom(@Param('id') roomId: string) {
    return this.chatRoomService.deleteRoom(roomId);
  }
}
