import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

// Controllers
import { ReputationController } from './controllers/reputation.controller';

// Services
import { ReputationService } from './services/reputation.service';
import { VerificationService } from './services/verification.service';
import { BadgeService } from './services/badge.service';

// Factors
import { TransactionFactorService } from './factors/transaction-factor.service';
import { ActivityFactorService } from './factors/activity-factor.service';
import { SocialFactorService } from './factors/social-factor.service';

// Utils
import { FraudDetectionUtil } from './utils/fraud-detection.util';
import { BlockchainVerificationUtil } from './utils/blockchain-verification.util';

// Tasks
import { ReputationUpdateTask } from './tasks/reputation-update.task';

// Entities
import { Reputation } from './entities/reputation.entity';
import { ReputationHistory } from './entities/reputation-history.entity';
import { Verification } from './entities/verification.entity';
import { Badge } from './entities/badge.entity';

// Guards
import { ReputationThresholdGuard } from './guards/reputation-threshold.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reputation,
      ReputationHistory,
      Verification,
      Badge,
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [ReputationController],
  providers: [
    ReputationService,
    VerificationService,
    BadgeService,
    TransactionFactorService,
    ActivityFactorService,
    SocialFactorService,
    FraudDetectionUtil,
    BlockchainVerificationUtil,
    ReputationUpdateTask,
    ReputationThresholdGuard,
    {
      provide: 'TRANSACTION_SERVICE',
      useValue: {
        // Mock service for development
        getUserMetrics: async (userId) => ({
          successfulTransactions: 15,
          totalVolume: 5000,
          averageTransactionsPerMonth: 8,
          transactionTypeCount: 3,
          disputedTransactions: 1,
          cancelledTransactions: 2,
        }),
        getTransactionPatterns: async (userId) => ({
          hasCircularTransactions: false,
          potentialWashTrading: false,
          volumeAnomalyScore: 0.2,
        }),
      },
    },
    {
      provide: 'ACTIVITY_SERVICE',
      useValue: {
        // Mock service for development
        getUserMetrics: async (userId) => ({
          loginDaysLastMonth: 20,
          contentCreated: 12,
          featuresUsed: 8,
          timeSpentLastMonth: 180,
          engagementActions: 45,
          reportedContent: 0,
        }),
        getSocialMetrics: async (userId) => ({
          followersCount: 120,
          receivedLikes: 85,
          receivedComments: 32,
          trustVouches: 5,
          helpfulResponses: 28,
          communityEvents: 3,
          blockedByUsers: 1,
          reportsByOthers: 0,
        }),
        getUserActivityPatterns: async (userId) => ({
          isTooConsistent: false,
          hasSuspiciousBursts: false,
          unusualHoursActivity: 0.1,
        }),
        getUserSocialGraph: async (userId) => ({
          coordinationScore: 0.2,
          clusterExclusivity: 0.5,
        }),
      },
    },
  ],
  exports: [
    ReputationService,
    VerificationService,
    BadgeService,
    ReputationThresholdGuard,
  ],
})
export class ReputationModule {}