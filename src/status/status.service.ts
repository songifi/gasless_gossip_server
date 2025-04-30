import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { MessageRecipient } from '../messages/entities/message-recipient.entity';
import { StatusGateway } from './status.gateway';

@Injectable()
export class StatusService {
  constructor(
    @InjectQueue('status-updates')
    private statusQueue: Queue,
    
    @InjectRepository(MessageRecipient)
    private messageRecipientRepository: Repository<MessageRecipient>,
    
    private statusGateway: StatusGateway,
  ) {}

  // Queue a status update
  async updateMessageStatus(
    messageId: string,
    recipientId: string,
    status: string,
  ): Promise<void> {
    // Add status update to the queue
    await this.statusQueue.add(
      'update-status',
      {
        messageId,
        recipientId,
        status,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  }

  // Sync status updates for users who were offline
  async syncStatusUpdatesForUser(userId: string): Promise<void> {
    try {
      // Find all messages sent by this user
      const sentMessages = await this.messageRecipientRepository
        .createQueryBuilder('mr')
        .innerJoinAndSelect('mr.message', 'm')
        .where('m.sender_id = :userId', { userId })
        .andWhere('mr.updated_at > :lastOnlineTime', {
          // Get updates from the last 24 hours or from user's last seen timestamp
          lastOnlineTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        })
        .getMany();

      // Send all status updates to the user
      if (sentMessages.length > 0) {
        const statusUpdates = sentMessages.map(mr => ({
          messageId: mr.messageId,
          recipientId: mr.recipientId,
          status: mr.status,
          timestamp: mr.updatedAt,
        }));

        this.statusGateway.sendStatusUpdate(
          userId,
          { batchUpdates: statusUpdates },
        );
      }
    } catch (error) {
      console.error(`Error syncing status updates for user ${userId}:`, error);
    }
  }
}
