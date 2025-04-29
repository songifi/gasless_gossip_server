import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Import all entities
import { Report } from './entities/report.entity';
import { ModerationAction } from './entities/moderation-action.entity';
import { FilterRule } from './entities/filter-rule.entity';
import { Penalty } from './entities/penalty.entity';
import { Appeal } from './entities/appeal.entity';

// Import all services
import { ReportService } from './services/report.service';
import { FilterService } from './services/filter.service';
import { PenaltyService } from './services/penalty.service';
import { AppealService } from './services/appeal.service';
import { AuditService } from './services/audit.service';

// Import all controllers
import { ReportController } from './controllers/report.controller';
import { ModerationController } from './controllers/moderation.controller';
import { AppealController } from './controllers/appeal.controller';

// Import subscribers
import { ContentSubscriber } from './subscribers/content.subscriber';

// Import required modules
import { UserModule } from '../user/user.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Report,
      ModerationAction,
      FilterRule,
      Penalty,
      Appeal,
    ]),
    UserModule,
    NotificationModule,
  ],
  providers: [
    ReportService,
    FilterService,
    PenaltyService,
    AppealService,
    AuditService,
    ContentSubscriber,
  ],
  controllers: [
    ReportController,
    ModerationController,
    AppealController,
  ],
  exports: [
    ReportService,
    FilterService,
    PenaltyService,
    AppealService,
    AuditService,
  ],
})
export class ModerationModule {}
