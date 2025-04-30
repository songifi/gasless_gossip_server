import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Notification } from '../entities/notification.entity';
import { NotificationChannel } from '../entities/notification-channel.entity';

@Injectable()
export class DeliveryService {
  constructor(@InjectQueue('notifications') private notificationsQueue: Queue) {}

  async scheduleDelivery(notification: Notification, channel: NotificationChannel): Promise<void> {
    await this.notificationsQueue.add('deliver', {
      notificationId: notification.id,
      channelId: channel.id,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }
}