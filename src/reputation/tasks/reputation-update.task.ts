import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reputation } from '../entities/reputation.entity';
import { ReputationService } from '../services/reputation.service';
import { BadgeService } from '../services/badge.service';

@Injectable()
export class ReputationUpdateTask {
  private readonly logger = new Logger(ReputationUpdateTask.name);

  constructor(
    @InjectRepository(Reputation)
    private reputationRepository: Repository<Reputation>,
    private reputationService: ReputationService,
    private badgeService: BadgeService,
  ) {}

  @Cron(CronExpression.EVERY_12_HOURS)
  async updateAllReputations() {
    this.logger.log('Starting scheduled reputation update for all users');
    
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 24);
    
    // Get users who haven't been updated in 24 hours
    const outdatedReputations = await this.reputationRepository.find({
      where: {
        lastCalculated: cutoffDate,
      },
      take: 100, // Process in batches
    });
    
    this.logger.log(`Found ${outdatedReputations.length} reputations to update`);
    
    for (const reputation of outdatedReputations) {
      try {
        await this.reputationService.calculateReputation(reputation.userId);
        await this.badgeService.checkBadgeProgress(reputation.userId);
        this.logger.debug(`Updated reputation for user ${reputation.userId}`);
      } catch (error) {
        this.logger.error(`Failed to update reputation for user ${reputation.userId}`, error.stack);
      }
    }
    
    this.logger.log('Completed scheduled reputation update');
  }

  @Cron(CronExpression.EVERY_WEEK)
  async cleanupOldHistory() {
    this.logger.log('Starting cleanup of old reputation history records');
    
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 3); // Keep last 3 months of detailed history
    
    // In a real implementation, you might want to archive this data rather than delete it
    // Or implement a more sophisticated retention policy
    try {
      // Implementation would depend on your database system
      // This is a placeholder for the scheduled task
      this.logger.log(`Would delete history records older than ${cutoffDate.toISOString()}`);
    } catch (error) {
      this.logger.error('Failed to clean up old history records', error.stack);
    }
  }
}
