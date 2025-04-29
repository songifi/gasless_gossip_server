import { Injectable, Inject } from '@nestjs/common';
import { ReputationFactor } from '../interfaces/reputation-factor.interface';

@Injectable()
export class ActivityFactorService implements ReputationFactor {
  name = 'activity';
  weight = 0.3;

  constructor(
    @Inject('ACTIVITY_SERVICE') private activityService: any,
  ) {}

  async calculate(userId: string): Promise<number> {
    // Get activity metrics from activity service
    const metrics = await this.activityService.getUserMetrics(userId);
    
    // Calculate raw score based on activity metrics
    let rawScore = 0;
    
    // Login frequency
    rawScore += metrics.loginDaysLastMonth * 1;
    
    // Content creation
    rawScore += metrics.contentCreated * 2;
    
    // Feature usage diversity
    rawScore += metrics.featuresUsed * 3;
    
    // Time spent on platform (hours)
    rawScore += Math.min(metrics.timeSpentLastMonth / 10, 20);
    
    // Engagement with others' content
    rawScore += metrics.engagementActions * 0.5;
    
    // Negative factors
    rawScore -= metrics.reportedContent * 10;
    
    return this.normalize(rawScore);
  }

  normalize(score: number): number {
    // Normalize to 0-100 scale
    return Math.min(100, Math.max(0, score));
  }
}
