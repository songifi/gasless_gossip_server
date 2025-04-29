import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';

import { UserModule } from '../user/user.module';
import { SocialGraphModule } from '../social-graph/social-graph.module';
import { ActivityModule } from '../activity/activity.module';

import { RecommendationService } from './services/recommendation.service';
import { SearchService } from './services/search.service';
import { TrendingService } from './services/trending.service';

import { RecommendationController } from './controllers/recommendation.controller';
import { SearchController } from './controllers/search.controller';
import { TrendingController } from './controllers/trending.controller';

import { RecommendationCalculationJob } from './jobs/recommendation-calculation.job';
import { TrendingCalculationJob } from './jobs/trending-calculation.job';

import { Recommendation } from './entities/recommendation.entity';
import { TrendingTopic } from './entities/trending-topic.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recommendation, TrendingTopic]),
    BullModule.registerQueue({
      name: 'discovery',
    }),
    ScheduleModule.forRoot(),
    UserModule,
    SocialGraphModule,
    ActivityModule,
  ],
  controllers: [
    RecommendationController,
    SearchController,
    TrendingController,
  ],
  providers: [
    RecommendationService,
    SearchService,
    TrendingService,
    RecommendationCalculationJob,
    TrendingCalculationJob,
  ],
  exports: [
    RecommendationService,
    SearchService,
    TrendingService,
  ],
})
export class DiscoveryModule {}
