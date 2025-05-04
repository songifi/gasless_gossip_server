import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { WebsocketMessage } from '../interfaces/websocket-message.interface';
import { WebsocketsService } from '../services/websockets.service';
import { PresenceService } from '../services/presence.service';

@Processor('websocket-messages')
export class MessageQueueProcessor {
  private readonly logger = new Logger(MessageQueueProcessor.name);

  constructor(
    private readonly websocketsService: WebsocketsService,
    private readonly presenceService: PresenceService,
  ) {}

  @Process('offline-message')
  async processOfflineMessage(job: Job<WebsocketMessage>): Promise<void> {
    try {
      this.logger.log(`Processing offline message job ${job.id}`);
      
      const message = job.data;
      const userId = message.userId;
      
      if (!userId) {
        throw new Error('No user ID in message data');
      }
      
      // Check if user is now online
      const isOnline = await this.presenceService.isUserOnline(userId);
      
      if (isOnline) {
        // User is now online, attempt delivery
        await this.websocketsService.publish(message);
        this.logger.log(`Delivered queued message to now-online user ${userId}`);
        return;
      }
      
      // User still offline, keep in queue
      this.logger.log(`User ${userId} still offline, keeping message in queue`);
      
      // If this is the last retry, we could store in a more permanent store
      // or send via alternative channels (push notification, email, etc.)
      if (job.attemptsMade >= job.opts.attempts - 1) {
        this.logger.warn(`Final delivery attempt failed for message to user ${userId}`);
        // Could implement fallback delivery methods here
      }
      
      // Throwing error will cause Bull to retry based on the backoff settings
      throw new Error('User still offline');
    } catch (error) {
      this.logger.error(`Error processing offline message: ${error.message}`);
      throw error; // Rethrow for Bull retry mechanism
    }
  }

  @Process('cleanup-expired-messages')
  async cleanupExpiredMessages(job: Job): Promise<void> {
    try {
      this.logger.log('Running expired messages cleanup job');
      
      // This would clean up very old messages that we no longer want to deliver
      // Implementation depends on your requirements
      
      // Get all jobs older than X days
      const olderThan = new Date();
      olderThan.setDate(olderThan.getDate() - 7); // 7 days ago
      
      // Could implement cleanup logic here
      
      this.logger.log('Expired messages cleanup completed');
    } catch (error) {
      this.logger.error(`Error cleaning up expired messages: ${error.message}`);
    }
  }
}