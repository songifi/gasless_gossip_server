import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs/redis';
import Redis from 'ioredis';
import { RoomRepository } from './room.repository';
import { CreateRoomDto } from './dto/create-room.dto';
import { MessageDto } from './dto/message.dto';
import { Room } from './entities/room.entity';
import { Message } from './entities/message.entity';

@Injectable()
export class ChatService {
  constructor(
    private readonly roomRepository: RoomRepository,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async createRoom(createRoomDto: CreateRoomDto): Promise<Room> {
    return this.roomRepository.createRoom(createRoomDto);
  }

  async getRooms(): Promise<Room[]> {
    return this.roomRepository.findAllRooms();
  }

  async getRoom(id: string): Promise<Room> {
    return this.roomRepository.findRoomById(id);
  }

  async getRoomMessages(roomId: string): Promise<Message[]> {
    return this.roomRepository.getRoomMessages(roomId);
  }

  async saveMessage(messageDto: MessageDto): Promise<Message> {
    return this.roomRepository.saveMessage(messageDto);
  }

  // Presence tracking with Redis
  async addUserToRoom(roomId: string, userId: string, username: string): Promise<void> {
    const userKey = room:${roomId}:user:${userId};
    await this.redis.hmset(userKey, { username, joinedAt: Date.now() });
    await this.redis.sadd(room:${roomId}:users, userId);
    await this.roomRepository.incrementUserCount(roomId);
  }

  async removeUserFromRoom(roomId: string, userId: string): Promise<void> {
    const userKey = room:${roomId}:user:${userId};
    await this.redis.del(userKey);
    await this.redis.srem(room:${roomId}:users, userId);
    await this.roomRepository.decrementUserCount(roomId);
  }

  async getUsersInRoom(roomId: string): Promise<{ userId: string; username: string }[]> {
    const userIds = await this.redis.smembers(room:${roomId}:users);
    const users = [];
    
    for (const userId of userIds) {
      const userData = await this.redis.hgetall(room:${roomId}:user:${userId});
      if (userData && userData.username) {
        users.push({ userId, username: userData.username });
      }
    }
    
    return users;
  }

  async isUserInRoom(roomId: string, userId: string): Promise<boolean> {
    return this.redis.sismember(room:${roomId}:users, userId) === 1;
  }
}
