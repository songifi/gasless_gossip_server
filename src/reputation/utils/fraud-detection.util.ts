import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reputation } from '../entities/reputation.entity';
import { ReputationHistory } from '../entities/reputation-history.entity';

@Injectable()
export class FraudDetectionUtil {
  private readonly logger = new Logger(FraudDetectionUtil.name);

  constructor(
    @InjectRepository(ReputationHistory)
    private historyRepository: Repository<ReputationHistory>,
    @Inject('TRANSACTION_SERVICE') private transactionService: any,
    @Inject('ACTIVITY_SERVICE') private activityService: any,
  ) {}

  async checkForFraud(userId: string, reputation: Reputation): Promise<boolean> {
    // Get latest reputation history records
    const recentHistory = await this.historyRepository.find({
      where: { reputationId: reputation.id },
      order: { recordedAt: 'DESC' },
      take: 10,
    });

    // Fraud detection rules
    const fraudIndicators = await Promise.all([
      this.checkForSuddenIncreases(recentHistory),
      this.checkForArtificialActivity(userId),
      this.checkForSuspiciousTransactions(userId),
      this.checkForCoordinatedBehavior(userId),
    ]);

    // If any check is true, we have detected potential fraud
    return fraudIndicators.some(indicator => indicator);
  }

  private async checkForSuddenIncreases(history: ReputationHistory[]): Promise<boolean> {
    if (history.length < 2) return false;
    
    // Check for sudden jumps in score (more than 20 points in a short period)
    for (let i = 0; i < history.length - 1; i++) {
      const current = history[i];
      const previous = history[i + 1];
      
      const scoreDifference = current.score - previous.score;
      const timeDifference = current.recordedAt.getTime() - previous.recordedAt.getTime();
      const hoursDifference = timeDifference / (1000 * 60 * 60);
      
      // Suspicious if more than 20 points gained in less than 24 hours
      if (scoreDifference > 20 && hoursDifference < 24) {
        this.logger.warn(`Suspicious score increase detected: +${scoreDifference} in ${hoursDifference} hours`);
        return true;
      }
    }
    
    return false;
  }

  private async checkForArtificialActivity(userId: string): Promise<boolean> {
    // Get activity patterns
    const activityPatterns = await this.activityService.getUserActivityPatterns(userId);
    
    // Check for bot-like behavior
    if (activityPatterns.isTooConsistent) {
      this.logger.warn(`Suspicious activity pattern: too consistent timing for user ${userId}`);
      return true;
    }
    
    // Check for activity bursts
    if (activityPatterns.hasSuspiciousBursts) {
      this.logger.warn(`Suspicious activity pattern: unusual bursts for user ${userId}`);
      return true;
    }
    
    // Check for activity during unusual hours
    if (activityPatterns.unusualHoursActivity > 0.8) {
      this.logger.warn(`Suspicious activity pattern: active during unusual hours for user ${userId}`);
      return true;
    }
    
    return false;
  }

  private async checkForSuspiciousTransactions(userId: string): Promise<boolean> {
    const transactionPatterns = await this.transactionService.getTransactionPatterns(userId);
    
    // Check for circular transactions
    if (transactionPatterns.hasCircularTransactions) {
      this.logger.warn(`Suspicious transaction pattern: circular transactions detected for user ${userId}`);
      return true;
    }
    
    // Check for wash trading
    if (transactionPatterns.potentialWashTrading) {
      this.logger.warn(`Suspicious transaction pattern: potential wash trading for user ${userId}`);
      return true;
    }
    
    // Check for unusual transaction volumes
    if (transactionPatterns.volumeAnomalyScore > 0.8) {
      this.logger.warn(`Suspicious transaction pattern: unusual volume for user ${userId}`);
      return true;
    }
    
    return false;
  }

  private async checkForCoordinatedBehavior(userId: string): Promise<boolean> {
    // Get social graph and interaction data
    const socialData = await this.activityService.getUserSocialGraph(userId);
    
    // Check for coordinated actions with other users
    if (socialData.coordinationScore > 0.7) {
      this.logger.warn(`Suspicious social pattern: potential coordination with other users for ${userId}`);
      return true;
    }
    
    // Check for tight-knit groups that only interact with each other
    if (socialData.clusterExclusivity > 0.9) {
      this.logger.warn(`Suspicious social pattern: exclusive cluster for user ${userId}`);
      return true;
    }
    
    return false;
  } from 'typeorm';