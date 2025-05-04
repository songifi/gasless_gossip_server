import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export type NotificationType = 'system' | 'user' | 'event';

export interface NotificationJob {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  channels?: ('push' | 'email' | 'in-app')[];
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectQueue('notification') private readonly notificationQueue: Queue<NotificationJob>,
  ) {}

  async sendNotification(notificationData: NotificationJob): Promise<{ jobId: string }> {
    // Set default channels if not provided
    if (!notificationData.channels || notificationData.channels.length === 0) {
      notificationData.channels = ['in-app'];
    }
    
    const job = await this.notificationQueue.add('send', notificationData, {
      priority: this.getPriorityForType(notificationData.type),
    });
    
    return { jobId: job.id.toString() };
  }

  async bulkSendNotification(userIds: string[], notificationData: Omit<NotificationJob, 'userId'>): Promise<{ jobIds: string[] }> {
    const jobs = await Promise.all(
      userIds.map(userId => 
        this.notificationQueue.add('send', { 
          ...notificationData, 
          userId 
        })
      )
    );
    
    return { jobIds: jobs.map(job => job.id.toString()) };
  }

  async getNotificationStatus(jobId: string): Promise<any> {
    const job = await this.notificationQueue.getJob(jobId);
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

  private getPriorityForType(type: NotificationType): number {
    switch (type) {
      case 'system':
        return 1; // Highest priority
      case 'event':
        return 2;
      case 'user':
        return 3;
      default:
        return 5;
    }
  }
