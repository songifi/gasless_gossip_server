import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { MessageRecipient } from './entities/message-recipient.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { StatusService } from '../status/status.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    
    @InjectRepository(MessageRecipient)
    private messageRecipientsRepository: Repository<MessageRecipient>,
    
    private statusService: StatusService,
  ) {}

  async createMessage(
    senderId: string,
    createMessageDto: CreateMessageDto,
  ): Promise<Message> {
    // Create the message
    const message = this.messagesRepository.create({
      senderId,
      conversationId: createMessageDto.conversationId,
      content: createMessageDto.content,
    });
    
    const savedMessage = await this.messagesRepository.save(message);
    
    // Create recipient records with initial 'sent' status
    for (const recipientId of createMessageDto.recipientIds) {
      const messageRecipient = this.messageRecipientsRepository.create({
        messageId: savedMessage.id,
        recipientId,
        status: 'sent',
      });
      
      await this.messageRecipientsRepository.save(messageRecipient);
      
      // Queue status updates for notification
      await this.statusService.updateMessageStatus(
        savedMessage.id,
        recipientId,
        'sent',
      );
    }
    
    return savedMessage;
  }
}
