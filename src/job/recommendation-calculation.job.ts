import { Injectable, Logger } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { RecommendationService } from '../services/recommendation.service';

@Processor('discovery')
@Injectable()
export class RecommendationCalculationJob {
  private readonly logger = new Logger(RecommendationCalculationJob.name);

  constructor(private readonly recommendationService: RecommendationService) {}

  @Process('calculate-recommendations')
  async handleRecommendationCalculation(job: Job<{ userId: string }>): Promise<void> {
    this.logger.log(`Calculating recommendations for user ${job.data.userId}`);
    
    try {
      // Calculate all types of recommendations
      await Promise.all([
        this.recommendationService.calculatePeopleRecommendations(job.data.userId),
        this.recommendationService.calculateContentRecommendations(job.data.userId),
        this.recommendationService.calculateCommunityRecommendations(job.data.userId),
      ]);
      
      this.logger.log(`Completed recommendations calculation for user ${job.data.userId}`);
    } catch (error) {
      this.logger.error(`Error calculating recommendations for user ${job.data.userId}:`, error);
      throw error;
    }
  }
}
