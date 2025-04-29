import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reputation } from '../entities/reputation.entity';
import { ReputationHistory } from '../entities/reputation-history.entity';
import { ReputationFactor } from '../interfaces/reputation-factor.interface';
import { TransactionFactorService } from '../factors/transaction-factor.service';
import { ActivityFactorService } from '../factors/activity-factor.service';
import { SocialFactorService } from '../factors/social-factor.service';
import { FraudDetectionUtil } from '../utils/fraud-detection.util';
import { ReputationUpdateDto } from '../dto/reputation-update.dto';

@Injectable()
export class ReputationService {
  private readonly logger = new Logger(ReputationService.name);
  private readonly factors: ReputationFactor[] = [];
  private readonly levelThresholds = {
    NEWCOMER: 0,
    BEGINNER: 20,
    INTERMEDIATE: 40,
    ADVANCED: 60,
    EXPERT: 80,
    MASTER: 95,
  };

  constructor(
    @InjectRepository(Reputation)
    private reputationRepository: Repository<Reputation>,
    @InjectRepository(ReputationHistory)
    private historyRepository: Repository<ReputationHistory>,
    private transactionFactor: TransactionFactorService,
    private activityFactor: ActivityFactorService,
    private socialFactor: SocialFactorService,
    private fraudDetection: FraudDetectionUtil,
  ) {
    this.factors = [
      this.transactionFactor,
      this.activityFactor,
      this.socialFactor,
    ];
  }

  async getReputationByUserId(userId: string): Promise<Reputation> {
    let reputation = await this.reputationRepository.findOne({
      where: { userId },
      relations: ['verifications'],
    });

    if (!reputation) {
      reputation = await this.createInitialReputation(userId);
    }

    return reputation;
  }

  async createInitialReputation(userId: string): Promise<Reputation> {
    const reputation = this.reputationRepository.create({
      userId,
      score: 0,
      transactionScore: 0,
      activityScore: 0,
      socialScore: 0,
      level: 'NEWCOMER',
      factorWeights: {
        transaction: 0.4,
        activity: 0.3,
        social: 0.3,
      },
      isVerified: false,
    });

    return this.reputationRepository.save(reputation);
  }

  async calculateReputation(userId: string): Promise<Reputation> {
    const reputation = await this.getReputationByUserId(userId);
    const prevScore = reputation.score;

    // Calculate individual factor scores
    reputation.transactionScore = await this.transactionFactor.calculate(userId);
    reputation.activityScore = await this.activityFactor.calculate(userId);
    reputation.socialScore = await this.socialFactor.calculate(userId);

    // Calculate weighted score
    reputation.score = this.calculateWeightedScore(reputation);

    // Check for potential fraud
    const isFraudulent = await this.fraudDetection.checkForFraud(userId, reputation);
    if (isFraudulent) {
      this.logger.warn(`Potential fraud detected for user ${userId}`);
      reputation.score = Math.max(0, reputation.score - 10); // Penalty for fraud
    }

    // Update level based on score
    reputation.level = this.determineLevelFromScore(reputation.score);
    reputation.lastCalculated = new Date();

    // Save updated reputation
    const updatedReputation = await this.reputationRepository.save(reputation);

    // Record history if score changed significantly
    if (Math.abs(prevScore - updatedReputation.score) >= 1) {
      await this.recordReputationHistory(updatedReputation, {
        prevScore,
        scoreChange: updatedReputation.score - prevScore,
      });
    }

    return updatedReputation;
  }

  private calculateWeightedScore(reputation: Reputation): number {
    const { factorWeights } = reputation;
    
    let weightedScore = 0;
    weightedScore += reputation.transactionScore * factorWeights.transaction;
    weightedScore += reputation.activityScore * factorWeights.activity;
    weightedScore += reputation.socialScore * factorWeights.social;
    
    // Normalize to 0-100 scale
    return Math.min(100, Math.max(0, weightedScore));
  }

  private determineLevelFromScore(score: number): string {
    const levels = Object.entries(this.levelThresholds)
      .sort((a, b) => b[1] - a[1]); // Sort by threshold value descending
    
    for (const [level, threshold] of levels) {
      if (score >= threshold) {
        return level;
      }
    }
    
    return 'NEWCOMER';
  }

  async recordReputationHistory(
    reputation: Reputation,
    changeData: { prevScore: number; scoreChange: number },
  ): Promise<ReputationHistory> {
    const history = this.historyRepository.create({
      reputationId: reputation.id,
      score: reputation.score,
      transactionScore: reputation.transactionScore,
      activityScore: reputation.activityScore,
      socialScore: reputation.socialScore,
      level: reputation.level,
      changeFactors: {
        prevScore: changeData.prevScore,
        scoreChange: changeData.scoreChange,
        timestamp: new Date(),
      },
    });

    return this.historyRepository.save(history);
  }

  async getReputationHistory(userId: string, startDate?: Date, endDate?: Date): Promise<ReputationHistory[]> {
    const reputation = await this.getReputationByUserId(userId);
    
    const query = this.historyRepository.createQueryBuilder('history')
      .where('history.reputationId = :reputationId', { reputationId: reputation.id })
      .orderBy('history.recordedAt', 'DESC');
    
    if (startDate) {
      query.andWhere('history.recordedAt >= :startDate', { startDate });
    }
    
    if (endDate) {
      query.andWhere('history.recordedAt <= :endDate', { endDate });
    }
    
    return query.getMany();
  }

  async updateReputationSettings(updateDto: ReputationUpdateDto): Promise<Reputation> {
    const reputation = await this.getReputationByUserId(updateDto.userId);
    
    if (updateDto.factorWeights) {
      reputation.factorWeights = {
        ...reputation.factorWeights,
        ...updateDto.factorWeights,
      };
    }
    
    // Recalculate score with new weights
    if (updateDto.factorWeights) {
      reputation.score = this.calculateWeightedScore(reputation);
    }
    
    return this.reputationRepository.save(reputation);
  }

  async getReputationTrends(userId: string, days: number = 30): Promise<any> {
    const reputation = await this.getReputationByUserId(userId);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const history = await this.historyRepository.createQueryBuilder('history')
      .where('history.reputationId = :reputationId', { reputationId: reputation.id })
      .andWhere('history.recordedAt >= :startDate', { startDate })
      .andWhere('history.recordedAt <= :endDate', { endDate })
      .orderBy('history.recordedAt', 'ASC')
      .getMany();
    
    // Group by day and calculate average scores
    const dailyScores = {};
    history.forEach(entry => {
      const day = entry.recordedAt.toISOString().split('T')[0];
      if (!dailyScores[day]) {
        dailyScores[day] = {
          count: 0,
          totalScore: 0,
          totalTransactionScore: 0,
          totalActivityScore: 0,
          totalSocialScore: 0,
        };
      }
      
      dailyScores[day].count++;
      dailyScores[day].totalScore += entry.score;
      dailyScores[day].totalTransactionScore += entry.transactionScore;
      dailyScores[day].totalActivityScore += entry.activityScore;
      dailyScores[day].totalSocialScore += entry.socialScore;
    });
    
    // Calculate averages
    const trends = Object.entries(dailyScores).map(([day, data]: [string, any]) => ({
      date: day,
      score: data.totalScore / data.count,
      transactionScore: data.totalTransactionScore / data.count,
      activityScore: data.totalActivityScore / data.count,
      socialScore: data.totalSocialScore / data.count,
    }));
    
    return {
      userId,
      currentScore: reputation.score,
      currentLevel: reputation.level,
      trends,
    };
  }
}
