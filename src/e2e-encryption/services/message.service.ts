// src/services/message.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../entities/message.entity';
import { CryptoService } from './crypto.service';
import { SessionService } from './session.service';
import { UserService } from './user.service';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private cryptoService: CryptoService,
    private sessionService: SessionService,
    private userService: UserService,
  ) {}

  async sendMessage(senderId: string, recipientId: string, content: string): Promise<Message> {
    // Get session key for these users
    const sessionKey = await this.sessionService.getSessionKey(senderId, recipientId);
    
    // Encrypt the message content
    const { encryptedData, iv } = this.cryptoService.encryptWithSymmetricKey(content, sessionKey);
    
    // Create and save the encrypted message
    const message = this.messageRepository.create({
      encryptedContent: encryptedData,
      iv,
      senderId,
      recipientId,
    });
    
    return this.messageRepository.save(message);
  }

  async getMessages(userId: string, otherUserId: string): Promise<{ id: string; content: string; fromMe: boolean; timestamp: Date }[]> {
    // Get all messages between these two users
    const messages = await this.messageRepository.find({
      where: [
        { senderId: userId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: userId },
      ],
      order: { createdAt: 'ASC' },
    });
    
    if (messages.length === 0) {
      return [];
    }
    
    // Get session key for these users
    const sessionKey = await this.sessionService.getSessionKey(userId, otherUserId);
    
    // Decrypt all messages
    return messages.map(message => {
      const decryptedContent = this.cryptoService.decryptWithSymmetricKey(
        message.encryptedContent,
        message.iv,
        sessionKey
      );
      
      return {
        id: message.id,
        content: decryptedContent,
        fromMe: message.senderId === userId,
        timestamp: message.createdAt,
      };
    });
  }
}