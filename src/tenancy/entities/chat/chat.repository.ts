
// src/chat/chat.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from '../entities/chat.entity';
import { BaseRepository } from '../repositories/base.repository';
import { SpaceContextService } from '../space/space-context.service';

@Injectable()
export class ChatRepository extends BaseRepository<Chat> {
  constructor(
    @InjectRepository(Chat)
    repository: Repository<Chat>,
    spaceContextService: SpaceContextService,
  ) {
    super(repository, spaceContextService);
  }
}

// src/chat/chat.service.ts
import { Injectable } from '@nestjs/common';
import { Chat } from '../entities/chat.entity';
import { ChatRepository } from './chat.repository';
import { CreateChatDto } from './dto/create-chat.dto';
import { SpaceContextService } from '../space/space-context.service';

@Injectable()
export class ChatService {
  constructor(
    private chatRepository: ChatRepository,
    private spaceContextService: SpaceContextService,
  ) {}

  async createChat(createChatDto: CreateChatDto, creatorId: string): Promise<Chat> {
    const spaceId = this.spaceContextService.getSpaceId();
    
    const chat = await this.chatRepository.create({
      name: createChatDto.name,
      isPrivate: createChatDto.isPrivate,
      spaceId,
      participants: [{ id: creatorId }],
    });
    
    return this.chatRepository.save(chat);
  }

  async getChats(): Promise<Chat[]> {
    // The space filtering is handled by the repository
    return this.chatRepository.find({
      relations: ['participants'],
    });
  }

  async getChatById(id: string): Promise<Chat> {
    // The space filtering is handled by the repository
    return this.chatRepository.findOne({
      where: { id },
      relations: ['participants', 'messages', 'messages.sender'],
    });
  }
}