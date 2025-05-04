import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Room } from './entities/room.entity';
import { Message } from './entities/message.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { MessageDto } from './dto/message.dto';

@Injectable()
export class RoomRepository {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  async createRoom(createRoomDto: CreateRoomDto): Promise<Room> {
    const room = this.roomRepository.create(createRoomDto);
    return this.roomRepository.save(room);
  }

  async findAllRooms(): Promise<Room[]> {
    return this.roomRepository.find();
  }

  async findRoomById(id: string): Promise<Room> {
    return this.roomRepository.findOne({ where: { id } });
  }

  async incrementUserCount(roomId: string): Promise<Room> {
    const room = await this.findRoomById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    room.userCount += 1;
    return this.roomRepository.save(room);
  }

  async decrementUserCount(roomId: string): Promise<Room> {
    const room = await this.findRoomById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    room.userCount = Math.max(0, room.userCount - 1);
    return this.roomRepository.save(room);
  }

  async saveMessage(messageDto: MessageDto): Promise<Message> {
    const room = await this.findRoomById(messageDto.roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    
    const message = this.messageRepository.create({
      content: messageDto.content,
      userId: messageDto.userId,
      username: messageDto.username,
      roomId: messageDto.roomId,
      type: messageDto.type || 'text',
      room,
    });
    
    return this.messageRepository.save(message);
  }

  async getRoomMessages(roomId: string, limit = 50): Promise<Message[]> {
    return this.messageRepository.find({
      where: { roomId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
