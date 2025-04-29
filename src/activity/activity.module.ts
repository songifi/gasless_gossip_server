// src/activity/activity.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Activity } from './entities/activity.entity';
import { ActivityTarget } from './entities/activity-target.entity';
import { FeedItem } from './entities/feed-item.entity';
import { FeedSubscription } from './entities/feed-subscription.entity';
import { ActivityService } from './services/activity.service';
import { FeedService } from './services/feed.service';
import { ActivityController } from './controllers/activity.controller';
import { ActivityGateway } from './gateways/activity.gateway';
import { FeedProcessor } from './processors/feed-processor';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Activity,
      ActivityTarget,
      FeedItem,
      FeedSubscription,
    ]),
    BullModule.registerQueue({
      name: 'feed',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
      },
    }),
    UserModule, // Import the User module for dependencies
  ],
  controllers: [ActivityController],
  providers: [
    ActivityService,
    FeedService,
    ActivityGateway,
    FeedProcessor,
  ],
  exports: [ActivityService, FeedService],
})
export class ActivityModule {}