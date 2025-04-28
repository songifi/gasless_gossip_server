import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Message,
  MessageType,
  MessageStatus,
} from '../entities/message.entity';
import { MessageRepository } from '../repositories/message.repository';
import { MessageQueryOptions } from '../interfaces/message-query-options.interface';
import { CreateMessageDto } from '../dto/create-message.dto';
import { UpdateMessageDto } from '../dto/update-message.dto';
import { MessageReaction } from '../entities/message-reaction.entity';
import { MessageRead } from '../entities/message-read.entity';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(MessageRepository)
    private messageRepository: MessageRepository,
    @InjectRepository(MessageRead)
    private messageReadRepository: Repository<MessageRead>,
    @InjectRepository(MessageReaction)
    private messageReactionRepository: Repository<MessageReaction>,
  ) {}

  async createMessage(
    createMessageDto: CreateMessageDto,
    user: User,
  ): Promise<Message> {
    // Check if replying to a valid message
    if (createMessageDto.replyToId) {
      const replyTo = await this.messageRepository.findOne({
        where: { id: createMessageDto.replyToId },
      });

      if (!replyTo) {
        throw new NotFoundException(
          `Reply message with ID "${createMessageDto.replyToId}" not found`,
        );
      }
    }

    const message = this.messageRepository.create({
      content: createMessageDto.content,
      type: createMessageDto.type || MessageType.TEXT,
      chatRoomId: createMessageDto.chatRoomId,
      senderId: user.id,
      replyToId: createMessageDto.replyToId,
      mediaUrl: createMessageDto.mediaUrl,
      mediaType: createMessageDto.mediaType,
      metadata: createMessageDto.metadata,
    });

    return this.messageRepository.save(message);
  }

  async createSystemMessage(
    chatRoomId: string,
    content: string,
    metadata?: Record<string, any>,
  ): Promise<Message> {
    const message = this.messageRepository.create({
      content,
      type: MessageType.SYSTEM,
      chatRoomId,
      metadata,
    });

    return this.messageRepository.save(message);
  }

  async getMessages(
    options: MessageQueryOptions,
  ): Promise<[Message[], boolean]> {
    const [messages, hasMore] =
      await this.messageRepository.findMessages(options);
    return [messages, hasMore === 1];
  }

  async getThreadMessages(
    parentMessageId: string,
    options: Omit<MessageQueryOptions, 'chatRoomId'>,
  ): Promise<[Message[], boolean]> {
    const parentMessage = await this.messageRepository.findOne({
      where: { id: parentMessageId },
    });

    if (!parentMessage) {
      throw new NotFoundException(
        `Parent message with ID "${parentMessageId}" not found`,
      );
    }

    const [messages, hasMore] = await this.messageRepository.findThreadMessages(
      parentMessageId,
      options,
    );
    return [messages, hasMore === 1];
  }

  async getMessage(id: string): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id },
      relations: [
        'sender',
        'reactions',
        'reactions.user',
        'readReceipts',
        'readReceipts.user',
      ],
    });

    if (!message) {
      throw new NotFoundException(`Message with ID "${id}" not found`);
    }

    return message;
  }

  async searchMessages(
    query: string,
    options: Partial<MessageQueryOptions>,
  ): Promise<[Message[], boolean]> {
    if (!query || query.trim().length < 3) {
      throw new BadRequestException(
        'Search query must be at least 3 characters long',
      );
    }

    const [messages, hasMore] = await this.messageRepository.searchMessages(
      query,
      options,
    );
    return [messages, hasMore === 1];
  }

  async updateMessage(
    id: string,
    updateMessageDto: UpdateMessageDto,
    userId: string,
  ): Promise<Message> {
    const message = await this.getMessage(id);

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    // Don't allow editing after a certain time period (e.g., 24 hours)
    const editTimeLimit = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const now = new Date().getTime();
    const messageTime = message.createdAt.getTime();

    if (now - messageTime > editTimeLimit) {
      throw new ForbiddenException(
        'Message can no longer be edited (time limit exceeded)',
      );
    }

    if (updateMessageDto.content) {
      message.content = updateMessageDto.content;
      message.isEdited = true;
    }

    if (updateMessageDto.metadata) {
      message.metadata = {
        ...(message.metadata || {}),
        ...updateMessageDto.metadata,
      };
    }

    return this.messageRepository.save(message);
  }

  async deleteMessage(
    id: string,
    userId: string,
    isAdmin = false,
  ): Promise<void> {
    const message = await this.getMessage(id);

    if (!isAdmin && message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    // Soft delete
    message.deletedAt = new Date();
    message.content = 'This message has been deleted';

    await this.messageRepository.save(message);
  }

  async markAsRead(messageId: string, userId: string): Promise<void> {
    const message = await this.getMessage(messageId);

    const existingRead = await this.messageReadRepository.findOne({
      where: { messageId, userId },
    });

    if (!existingRead) {
      await this.messageReadRepository.save({
        messageId,
        userId,
      });
    }

    // Update message status if needed
    if (message.status !== MessageStatus.READ) {
      message.status = MessageStatus.READ;
      await this.messageRepository.save(message);
    }
  }

  async addReaction(
    messageId: string,
    userId: string,
    reaction: string,
  ): Promise<MessageReaction> {
    await this.getMessage(messageId);

    const existingReaction = await this.messageReactionRepository.findOne({
      where: { messageId, userId, reaction },
    });

    if (existingReaction) {
      return existingReaction;
    }

    const newReaction = this.messageReactionRepository.create({
      messageId,
      userId,
      reaction,
    });

    return this.messageReactionRepository.save(newReaction);
  }

  async removeReaction(
    messageId: string,
    userId: string,
    reaction: string,
  ): Promise<void> {
    await this.messageReactionRepository.delete({
      messageId,
      userId,
      reaction,
    });
  }

  // Methods for message retention and archiving
  async archiveOldMessages(
    chatRoomId: string,
    olderThan: Date,
  ): Promise<number> {
    // Archive messages by adding a flag in metadata
    const result = await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({
        metadata: () =>
          `jsonb_set(COALESCE(metadata, '{}'), '{archived}', 'true')`,
      })
      .where('chatRoomId = :chatRoomId', { chatRoomId })
      .andWhere('createdAt < :olderThan', { olderThan })
      .andWhere(
        `(metadata IS NULL OR metadata->'archived' IS NULL OR metadata->>'archived' = 'false')`,
      )
      .execute();

    return result.affected || 0;
  }

  async cleanupDeletedMessages(olderThan: Date): Promise<number> {
    // Permanently delete messages that were soft-deleted more than X days ago
    const result = await this.messageRepository
      .createQueryBuilder()
      .delete()
      .from(Message)
      .where('deletedAt IS NOT NULL')
      .andWhere('deletedAt < :olderThan', { olderThan })
      .execute();

    return result.affected || 0;
  }
}
