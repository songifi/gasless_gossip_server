import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { WebsocketsGateway } from './websockets.gateway';
import { WebsocketsService } from './services/websockets.service';
import { MessageQueueService } from './services/message-queue.service';
import { PresenceService } from './services/presence.service';
import { WebsocketEventLoggerService } from './services/websocket-logger.service';
import { WebsocketJwtGuard } from './guards/websocket-jwt.guard';
import { WebsocketThrottlerGuard } from './guards/websocket-throttler.guard';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async () => ({
        secret: process.env.JWT_SECRET || 'your-secret-key',
        signOptions: { expiresIn: '1d' },
      }),
    }),
    BullModule.registerQueue({
      name: 'websocket-messages',
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    RedisModule.forRootAsync(),
  ],
  providers: [
    WebsocketsGateway,
    WebsocketsService,
    MessageQueueService,
    PresenceService,
    WebsocketEventLoggerService,
    WebsocketJwtGuard,
    WebsocketThrottlerGuard,
  ],
  exports: [
    WebsocketsGateway,
    WebsocketsService,
    MessageQueueService,
    PresenceService
  ],
})
export class WebsocketsModule {}