import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { RoomRepository } from './room.repository';
import { Room } from './entities/room.entity';
import { Message } from './entities/message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room, Message]),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, RoomRepository],
})
export class ChatModule {}
