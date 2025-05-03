import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export interface MessageDeliveryJob {
  messageId: string;
  userId: string;
  channelId: string;
  content: string;
  attachments?: string[];
  metadata?: Record<string, any>;
}

export interface MessageModerationJob {
  messageId: string;
  content: string;
  userId: string;
}

@Injectable()
export class MessageService {
  constructor(
    @InjectQueue('message') private readonly messageQueue: Queue,
  ) {}

  async sendMessage(messageData: MessageDeliveryJob): Promise<{ jobId: string }> {
    const job = await this.messageQueue.add('delivery', messageData);
    
    // Add a moderation job if content exists
    if (messageData.content) {
      await this.messageQueue.add('moderation', {
        messageId: messageData.messageId,
        content: messageData.content,
        userId: messageData.userId,
      });
    }
    
    return { jobId: job.id.toString() };
  }
  
  async markAsRead(messageId: string, userId: string): Promise<{ jobId: string }> {
    const job = await this.messageQueue.add('read-receipt', {
      messageId,
      userId,
      timestamp: new Date().toISOString(),
    });
    
    return { jobId: job.id.toString() };
  }

  async getMessageStatus(jobId: string): Promise<any> {
    const job = await this.messageQueue.getJob(jobId);
    if (!job) {
      return { status: 'not_found' };
    }
    
    const state = await job.getState();
    return {
      id: job.id,
      status: state,
      data: job.data,
    };
  }
}
 ⁠
