import { Injectable, Inject } from '@nestjs/common';
import { ReputationFactor } from '../interfaces/reputation-factor.interface';

@Injectable()
export class SocialFactorService implements ReputationFactor {
  name = 'social';
  weight = 0.3;

  constructor(
    @Inject('ACTIVITY_SERVICE') private activityService: any,
  ) {}

  async calculate(userId: string): Promise<number> {
    // Get social metrics from activity service
    const metrics = await this.activityService.getSocialMetrics(userId);
    
    // Calculate raw score based on social metrics
    let rawScore = 0;
    
    // Followers count (with diminishing returns)
    rawScore += Math.min(Math.sqrt(metrics.followersCount) * 2, 30);
    
    // Positive interactions received
    rawScore += metrics.receivedLikes * 0.2;
    rawScore += metrics.receivedComments * 0.5;
    
    // Trust vouches from other users
    rawScore += metrics.trustVouches * 5;
    
    // Community contributions
    rawScore += metrics.helpfulResponses * 2;
    rawScore += metrics.communityEvents * 3;
    
    // Negative factors
    rawScore -= metrics.blockedByUsers * 5;
    rawScore -= metrics.reportsByOthers * 3;
    
    return this.normalize(rawScore);
  }

  normalize(score: number): number {
    // Normalize to 0-100 scale
    return Math.min(100, Math.max(0, score));
  }