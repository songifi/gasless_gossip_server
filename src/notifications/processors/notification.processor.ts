import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationDelivery } from '../entities/notification-delivery.entity';
import { Notification } from '../entities/notification.entity';
import { NotificationChannel } from '../entities/notification-channel.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmailService } from '../../auth/email/email.service'; // Use existing EmailService
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Processor('notifications')
export class NotificationProcessor {
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(NotificationDelivery)
    private deliveryRepo: Repository<NotificationDelivery>,
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    @InjectRepository(NotificationChannel)
    private channelRepo: Repository<NotificationChannel>,
    private eventEmitter: EventEmitter2,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {
    // Initialize nodemailer for fallback if EmailService is insufficient
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('notifications.email.smtp') || 'smtp.example.com',
      port: 587,
      secure: false,
      auth: {
        user: this.configService.get('notifications.email.user'),
        pass: this.configService.get('notifications.email.pass'),
      },
    });
  }

  @Process('deliver')
  async deliverNotification(job: Job<{ notificationId: string; channelId: string }>) {
    const { notificationId, channelId } = job.data;
    const notification = await this.notificationRepo.findOne({ 
      where: { id: notificationId }, 
      relations: ['recipient'] 
    });
    const channel = await this.channelRepo.findOne({ where: { id: channelId } });

    if (!notification || !channel) throw new Error('Notification or channel not found');

    const delivery = this.deliveryRepo.create({ 
      notification, 
      channel, 
      status: 'pending',
      attempts: 0,
    });
    await this.deliveryRepo.save(delivery);

    try {
      switch (channel.name) {
        case 'in-app':
          this.eventEmitter.emit('notification.delivered', { 
            userId: notification.recipient.id, 
            notification 
          });
          delivery.status = 'delivered';
          break;
        case 'email':
          await this.emailService.sendEmail({
            to: notification.recipient.email,
            subject: notification.content.subject || 'Notification',
            text: notification.content.body || JSON.stringify(notification.content),
          });
          delivery.status = 'sent';
          break;
        case 'push':
          // TODO: Implement FCM/APNS integration
          console.log('Push notification placeholder');
          delivery.status = 'sent';
          break;
        case 'webhook':
          // TODO: Implement webhook HTTP request
          console.log('Webhook notification placeholder');
          delivery.status = 'sent';
          break;
        case 'blockchain':
          // TODO: Implement StarkNet event notification
          console.log('Blockchain notification placeholder');
          delivery.status = 'sent';
          break;
        default:
          throw new Error(`Unsupported channel: ${channel.name}`);
      }
      delivery.attempts += 1;
      delivery.lastAttemptAt = new Date();
      await this.deliveryRepo.save(delivery);
    } catch (error) {
      delivery.status = 'failed';
      delivery.attempts += 1;
      delivery.lastAttemptAt = new Date();
      await this.deliveryRepo.save(delivery);
      if (delivery.attempts < 3) {
        throw error; // Trigger retry
      }
      await this.deliveryRepo.save(delivery);
    }
  }
}