import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ReputationService } from '../services/reputation.service';

@Injectable()
export class ReputationThresholdGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private reputationService: ReputationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredLevel = this.reflector.get<string>(
      'reputationLevel',
      context.getHandler(),
    ) || 'INTERMEDIATE';
    
    const requiredScore = this.reflector.get<number>(
      'reputationScore',
      context.getHandler(),
    ) || 40;
    
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id; // Assuming auth middleware sets user
    
    if (!userId) {
      return false;
    }
    
    try {
      const reputation = await this.reputationService.getReputationByUserId(userId);
      
      // Check if user meets level requirement
      const meetsSCoreThreshold = reputation.score >= requiredScore;
      
      // Map levels to numeric values for comparison
      const levelValues = {
        NEWCOMER: 0,
        BEGINNER: 1,
        INTERMEDIATE: 2,
        ADVANCED: 3,
        EXPERT: 4,
        MASTER: 5,
      };
      
      const userLevelValue = levelValues[reputation.level] || 0;
      const requiredLevelValue = levelValues[requiredLevel] || 0;
      
      const meetsLevelThreshold = userLevelValue >= requiredLevelValue;
      
      return meetsSCoreThreshold && meetsLevelThreshold;
    } catch (error) {
      return false;
    }
  }
}
