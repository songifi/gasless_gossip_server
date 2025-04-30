import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Notification } from './entities/notification.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationChannel } from './entities/notification-channel.entity';
import { NotificationDelivery } from './entities/notification-delivery.entity';
import { NotificationService } from './services/notification.service';
import { TemplateService } from './services/template.service';
import { PreferenceService } from './services/preference.service';
import { DeliveryService } from './services/delivery.service';
import { NotificationProcessor } from './processors/notification.processor';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationGateway } from './gateways/notification.gateway';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationTemplate,
      NotificationPreference,
      NotificationChannel,
      NotificationDelivery,
    ]),
    BullModule.registerQueueAsync({
      name: 'notifications',
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('redis.host') || 'localhost',
          port: configService.get('redis.port') || 6379,
        },
      }),
      inject: [ConfigService],
    }),
    EventEmitterModule.forRoot(),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '60m' },
      }),
      inject: [ConfigService],
    }),
    AuthModule, // For EmailService
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationService,
    TemplateService,
    PreferenceService,
    DeliveryService,
    NotificationProcessor,
    NotificationGateway,
  ],
  exports: [NotificationService],
})
export class NotificationsModule {}