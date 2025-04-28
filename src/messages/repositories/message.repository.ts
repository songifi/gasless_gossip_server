import { EntityRepository, Repository } from 'typeorm';
import { Message } from '../entities/message.entity';
import { MessageQueryOptions } from '../interfaces/message-query-options.interface';

@EntityRepository(Message)
export class MessageRepository extends Repository<Message> {
  async findMessages(
    options: MessageQueryOptions,
  ): Promise<[Message[], number]> {
    const {
      chatRoomId,
      limit = 50,
      cursor,
      senderId,
      type,
      search,
      includeDeleted = false,
      orderDirection = 'DESC',
    } = options;

    const queryBuilder = this.createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.reactions', 'reactions')
      .leftJoinAndSelect('reactions.user', 'reactionUser')
      .leftJoinAndSelect('message.readReceipts', 'readReceipts')
      .leftJoinAndSelect('readReceipts.user', 'readUser')
      .where('message.chatRoomId = :chatRoomId', { chatRoomId });

    if (!includeDeleted) {
      queryBuilder.andWhere('message.deletedAt IS NULL');
    }

    if (senderId) {
      queryBuilder.andWhere('message.senderId = :senderId', { senderId });
    }

    if (type) {
      queryBuilder.andWhere('message.type = :type', { type });
    }

    if (search) {
      queryBuilder.andWhere('message.content ILIKE :search', {
        search: `%${search}%`,
      });
    }

    if (cursor) {
      if (orderDirection === 'DESC') {
        queryBuilder.andWhere('message.createdAt < :cursor', {
          cursor: new Date(cursor),
        });
      } else {
        queryBuilder.andWhere('message.createdAt > :cursor', {
          cursor: new Date(cursor),
        });
      }
    }

    queryBuilder.orderBy('message.createdAt', orderDirection).take(limit + 1); // +1 to determine if there are more messages

    const messages = await queryBuilder.getMany();
    const hasMore = messages.length > limit;

    if (hasMore) {
      messages.pop(); // Remove the extra message we fetched
    }

    return [messages, hasMore ? 1 : 0];
  }

  async findThreadMessages(
    parentMessageId: string,
    options: Omit<MessageQueryOptions, 'chatRoomId'>,
  ): Promise<[Message[], number]> {
    const { limit = 50, cursor, orderDirection = 'DESC' } = options;

    const queryBuilder = this.createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.reactions', 'reactions')
      .leftJoinAndSelect('reactions.user', 'reactionUser')
      .leftJoinAndSelect('message.readReceipts', 'readReceipts')
      .where('message.replyToId = :parentMessageId', { parentMessageId })
      .andWhere('message.deletedAt IS NULL');

    if (cursor) {
      if (orderDirection === 'DESC') {
        queryBuilder.andWhere('message.createdAt < :cursor', {
          cursor: new Date(cursor),
        });
      } else {
        queryBuilder.andWhere('message.createdAt > :cursor', {
          cursor: new Date(cursor),
        });
      }
    }

    queryBuilder.orderBy('message.createdAt', orderDirection).take(limit + 1);

    const messages = await queryBuilder.getMany();
    const hasMore = messages.length > limit;

    if (hasMore) {
      messages.pop();
    }

    return [messages, hasMore ? 1 : 0];
  }

  async searchMessages(
    query: string,
    options: Partial<MessageQueryOptions>,
  ): Promise<[Message[], number]> {
    const { chatRoomId, limit = 50, senderId } = options;

    const queryBuilder = this.createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.content ILIKE :query', { query: `%${query}%` })
      .andWhere('message.deletedAt IS NULL');

    if (chatRoomId) {
      queryBuilder.andWhere('message.chatRoomId = :chatRoomId', { chatRoomId });
    }

    if (senderId) {
      queryBuilder.andWhere('message.senderId = :senderId', { senderId });
    }

    queryBuilder.orderBy('message.createdAt', 'DESC').take(limit + 1);

    const messages = await queryBuilder.getMany();
    const hasMore = messages.length > limit;

    if (hasMore) {
      messages.pop();
    }

    return [messages, hasMore ? 1 : 0];
  }
}
