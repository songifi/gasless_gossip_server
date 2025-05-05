import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { WebsocketMessage } from '../interfaces/websocket-message.interface';

@Injectable()
export class MessageQueueService {
  private readonly logger = new Logger(MessageQueueService.name);

  constructor(
    @InjectQueue('websocket-messages') private readonly messageQueue: Queue,
  ) {}

  async queueMessageForOfflineUser(message: WebsocketMessage): Promise<void> {
    try {
      if (!message.userId) {
        this.logger.warn('Cannot queue message - no userId provided');
        return;
      }

      // Add to queue with user ID as job ID for easy retrieval
      await this.messageQueue.add(
        'offline-message',
        message,
        {
          jobId: `${message.userId}-${message.messageId || Date.now()}`,
          // Store for up to 7 days
          removeOnComplete: 7 * 24 * 60 * 60,
          // Store for up to 7 days if failed
          removeOnFail: 7 * 24 * 60 * 60,
          // Add metadata about the target user
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );
      
      this.logger.debug(`Message queued for offline user ${message.userId}`);
    } catch (error) {
      this.logger.error(`Error queueing message: ${error.message}`);
    }
  }

  async getQueuedMessagesForUser(userId: string): Promise<WebsocketMessage[]> {
    try {
      // Get all jobs from the queue that match the user ID pattern
      const jobs = await this.messageQueue.getJobs(['waiting', 'delayed', 'active']);
      
      // Filter for jobs intended for this user
      const userJobs = jobs.filter(job => 
        job.id.toString().startsWith(`${userId}-`) && 
        job.name === 'offline-message'
      );
      
      // Mark these jobs as completed since we're delivering them now
      await Promise.all(userJobs.map(job => job.moveToCompleted()));
      
      // Extract the message content
      return userJobs.map(job => job.data as WebsocketMessage);
    } catch (error) {
      this.logger.error(`Error getting queued messages: ${error.message}`);
      return [];
    }
  }

  async clearQueuedMessagesForUser(userId: string): Promise<number> {
    try {
      const jobs = await this.messageQueue.getJobs(['waiting', 'delayed', 'active']);
      
      // Filter for jobs intended for this user
      const userJobs = jobs.filter(job => 
        job.id.toString().startsWith(`${userId}-`) && 
        job.name === 'offline-message'
      );
      
      // Remove these jobs
      await Promise.all(userJobs.map(job => job.remove()));
      
      return userJobs.length;
    } catch (error) {
      this.logger.error(`Error clearing queued messages: ${error.message}`);
      return 0;
    }
  }
}