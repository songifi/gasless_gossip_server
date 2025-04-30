import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { User } from '../../users/entities/user.entity';
import { TemplateService } from './template.service';
import { PreferenceService } from './preference.service';
import { DeliveryService } from './delivery.service';
import { NotificationChannel } from '../entities/notification-channel.entity';
import { FilterNotificationsDto } from '../dto/filter-notifications.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    private templateService: TemplateService,
    private preferenceService: PreferenceService,
    private deliveryService: DeliveryService,
    @InjectRepository(NotificationChannel)
    private channelRepo: Repository<NotificationChannel>,
  ) {}

  async createNotification(
    type: string,
    recipient: User,
    data: Record<string, any>,
    metadata?: Record<string, any>,
  ): Promise<Notification> {
    const preferences = await this.preferenceService.getUserPreferences(recipient.id, type);
    const channels = preferences.length > 0
      ? preferences.map(p => p.channel)
      : [await this.getDefaultChannel()];

    const language = recipient.settings?.language || 'en';
    const template = await this.templateService.getTemplate(type, language);
    const content = this.templateService.renderTemplate(template.content, data);

    const notification = this.notificationRepo.create({
      type,
      content,
      recipient,
      metadata,
      status: 'unread',
    });
    await this.notificationRepo.save(notification);

    for (const channel of channels) {
      await this.deliveryService.scheduleDelivery(notification, channel);
    }

    return notification;
  }

  private async getDefaultChannel(): Promise<NotificationChannel> {
    const channel = await this.channelRepo.findOne({ where: { name: 'in-app' } });
    if (!channel) throw new NotFoundException('Default channel not found');
    return channel;
  }

  async getUserNotifications(userId: string, filter: FilterNotificationsDto): Promise<Notification[]> {
    const query = this.notificationRepo.createQueryBuilder('notification')
      .leftJoinAndSelect('notification.recipient', 'recipient')
      .where('notification.recipientId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC');

    if (filter.type) query.andWhere('notification.type = :type', { type: filter.type });
    if (filter.status) query.andWhere('notification.status = :status', { status: filter.status });

    const page = parseInt(filter.page || '1', 10);
    const limit = parseInt(filter.limit || '10', 10);
    query.skip((page - 1) * limit).take(limit);

    return query.getMany();
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({ where: { id, recipient: { id: userId } } });
    if (!notification) throw new NotFoundException('Notification not found');
    await this.notificationRepo.update({ id }, { status: 'read' });
  }
}