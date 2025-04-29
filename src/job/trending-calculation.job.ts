import { Injectable, Logger } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { TrendingService } from '../services/trending.service';

@Processor('discovery')
@Injectable()
export class TrendingCalculationJob {
  private readonly logger = new Logger(TrendingCalculationJob.name);

  constructor(private readonly trendingService: TrendingService) {}

  @Process('calculate-trending')
  async handleTrendingCalculation(job: Job): Promise<void> {
    this.logger.log('Processing trending topics calculation');
    
    try {
      await this.trendingService.performTrendingCalculation();
      this.logger.log('Completed trending topics calculation');
    } catch (error) {
      this.logger.error('Error calculating trending topics:', error);
      throw error;
    }
  }
}
