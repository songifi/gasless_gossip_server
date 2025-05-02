// message.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';
import { CryptoService } from './crypto.service';
import { EventsGateway } from './events.gateway';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private cryptoService: CryptoService,
    private eventsGateway: EventsGateway,
  ) {}
  
  async createMessage(senderId: string, recipientId: string, content: string): Promise<Message> {
    // Encrypt the message before storing
    const encryptedContent = this.cryptoService.encryptMessage(content, recipientId);
    
    // Create and save the message with encrypted content
    const message = this.messageRepository.create({
      senderId,
      recipientId,
      content: encryptedContent,
      createdAt: new Date(),
    });
    
    await this.messageRepository.save(message);
    
    // Emit the encrypted message through WebSockets
    this.eventsGateway.emitMessage(recipientId, {
      id: message.id,
      senderId: message.senderId,
      recipientId: message.recipientId,
      content: encryptedContent,
      createdAt: message.createdAt,
    });
    
    return message;
  }
  
  async getMessagesBetweenUsers(userA: string, userB: string): Promise<Message[]> {
    return this.messageRepository.find({
      where: [
        { senderId: userA, recipientId: userB },
        { senderId: userB, recipientId: userA },
      ],
      order: {
        createdAt: 'ASC',
      },
    });
  }
}