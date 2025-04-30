import { Injectable } from '@nestjs/common';
import { ChatRoomRepository } from '../chat-room.repository';
import { UpdateRoomDto } from '../dto/update-room.dto';
import { CreateRoomDto } from '../dto/create-room.dto';
import { NotificationService } from '../../notifications/services/notification.service';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class ChatRoomService {
  constructor(
    private readonly roomRepo: ChatRoomRepository,
    private notificationService: NotificationService,
  ) {}

  create(createChatRoomDto: CreateRoomDto, id: any) {
    throw new Error('Method not implemented.');
  }

  findAll(id: any) {
    throw new Error('Method not implemented.');
  }

  findOne(id: string, id1: any) {
    throw new Error('Method not implemented.');
  }

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

  // Placeholder for sending messages (assuming message handling is added later)
  async sendMessage(roomId: string, sender: User, content: string) {
    // Assuming message creation logic
    const message = { roomId, sender, content }; // Placeholder
    // Save message to database (implement later)

    await this.notificationService.createNotification(
      'message',
      sender, // In a real implementation, notify room members
      { content, roomId },
      { messageId: 'placeholder-message-id' }
    );

    return message;
  }
}