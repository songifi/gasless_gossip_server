import { Injectable } from '@nestjs/common';
import { ChatRoomRepository } from '../chat-room.repository';
import { UpdateRoomDto } from '../dto/update-room.dto';
import { CreateRoomDto } from '../dto/create-room.dto';

@Injectable()
export class ChatRoomService {
  constructor(private readonly roomRepo: ChatRoomRepository) {}

  async createRoom(dto: CreateRoomDto) {
    const room = this.roomRepo.createRoom(dto);
    return room;
  }

  async updateRoom(roomId: string, dto: UpdateRoomDto) {
    await this.roomRepo.chatRoomRepo.update(roomId, dto);
    return this.roomRepo.chatRoomRepo.findOne({ where: { id: roomId } });
  }

  async deleteRoom(roomId: string) {
    return this.roomRepo.chatRoomRepo.softDelete(roomId);
  }
}
