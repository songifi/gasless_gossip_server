import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatRoomController } from './chat-room.controller';
import { ChatRoomService } from './provider/chat-room.service';
import { ChatRoomRepository } from './chat-room.repository';
import { RolesGuard } from './guards/roles.guard';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatRoomMember } from './entities/chat-room-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ChatRoom, ChatRoomMember])],
  controllers: [ChatRoomController],
  providers: [ChatRoomService, ChatRoomRepository, RolesGuard],
})
export class ChatRoomModule {}