import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRoomDto } from './dto/create-room.dto';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatRoomMember } from './entities/chat-room-member.entity';

@Injectable()
export class ChatRoomRepository {
  constructor(
    @InjectRepository(ChatRoom)
    public readonly chatRoomRepo: Repository<ChatRoom>,
    @InjectRepository(ChatRoomMember)
    public readonly chatRoomMemberRepo: Repository<ChatRoomMember>,
  ) {}

  async createRoom(dto: CreateRoomDto): Promise<ChatRoom> {
    const room = this.chatRoomRepo.create(dto);
    return this.chatRoomRepo.save(room);
  }
}
