import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Badge } from '../entities/badge.entity';
import { ReputationService } from './reputation.service';

@Injectable()
export class BadgeService {
  private readonly logger = new Logger(BadgeService.name);
  private readonly badgeTypes = {
    TRUSTED_TRADER: {
      requirements: {
        transactionScore: 70,
        minimumTransactions: 10,
      },
    },
    COMMUNITY_LEADER: {
      requirements: {
        socialScore: 80,
        activeDays: 30,
      },
    },
    VERIFIED_EXPERT: {
      requirements: {
        score: 90,
        isVerified: true,
      },
    },
    EARLY_ADOPTER: {
      requirements: {
        activeDays: 90,
        createdBefore: '2023-12-31',
      },
    },
    POWER_USER: {
      requirements: {
        activityScore: 75,
        dailyLoginStreak: 14,
      },
    },
  };

  constructor(
    @InjectRepository(Badge)
    private badgeRepository: Repository<Badge>,
    private reputationService: ReputationService,
  ) {}

  async getBadgesByUserId(userId: string): Promise<Badge[]> {
    return this.badgeRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async checkBadgeProgress(userId: string): Promise<Badge[]> {
    const reputation = await this.reputationService.getReputationByUserId(userId);
    const userBadges = await this.getBadgesByUserId(userId);
    const updatedBadges: Badge[] = [];

    // Check each badge type
    for (const [type, details] of Object.entries(this.badgeTypes)) {
      let badge = userBadges.find(b => b.type === type);
      
      if (!badge) {
        badge = this.badgeRepository.create({
          userId,
          type,
          status: 'IN_PROGRESS',
          progress: 0,
          requirements: details.requirements,
        });
      }

      // Calculate progress
      const progress = await this.calculateBadgeProgress(userId, type, reputation);
      badge.progress = progress;

      // Check if badge can be awarded
      if (progress >= 100 && badge.status !== 'AWARDED') {
        badge.status = 'AWARDED';
        badge.awardedAt = new Date();
        // Here you would also trigger notifications
      }

      updatedBadges.push(await this.badgeRepository.save(badge));
    }

    return updatedBadges;
  }

  private async calculateBadgeProgress(
    userId: string,
    badgeType: string,
    reputation: any,
  ): Promise<number> {
    const requirements = this.badgeTypes[badgeType].requirements;
    let totalRequirements = 0;
    let metRequirements = 0;

    // Check each requirement
    for (const [key, value] of Object.entries(requirements)) {
      totalRequirements++;
      
      switch (key) {
        case 'transactionScore':
          if (reputation.transactionScore >= value) metRequirements++;
          break;
        case 'socialScore':
          if (reputation.socialScore >= value) metRequirements++;
          break;
        case 'activityScore':
          if (reputation.activityScore >= value) metRequirements++;
          break;
        case 'score':
          if (reputation.score >= value) metRequirements++;
          break;
        case 'isVerified':
          if (reputation.isVerified === value) metRequirements++;
          break;
        case 'minimumTransactions':
          // Would need to check with transaction service
          // For now, simulate with random boolean
          if (Math.random() > 0.5) metRequirements++;
          break;
        case 'activeDays':
        case 'dailyLoginStreak':
          // Would need to check with activity service
          // For now, simulate with random boolean
          if (Math.random() > 0.5) metRequirements++;
          break;
        case 'createdBefore':
          // Would need to check user creation date
          // For now, simulate with random boolean
          if (Math.random() > 0.5) metRequirements++;
          break;
      }
    }

    return totalRequirements > 0 
      ? (metRequirements / totalRequirements) * 100 
      : 0;
  }
}
