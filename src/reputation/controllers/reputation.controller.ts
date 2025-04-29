import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
    UseGuards,
    HttpStatus,
    HttpException,
  } from '@nestjs/common';
  import { ReputationService } from '../services/reputation.service';
  import { VerificationService } from '../services/verification.service';
  import { BadgeService } from '../services/badge.service';
  import { ReputationQueryDto } from '../dto/reputation-query.dto';
  import { ReputationUpdateDto } from '../dto/reputation-update.dto';
  import { ReputationThresholdGuard } from '../guards/reputation-threshold.guard';
  
  @Controller('reputation')
  export class ReputationController {
    constructor(
      private reputationService: ReputationService,
      private verificationService: VerificationService,
      private badgeService: BadgeService,
    ) {}
  
    @Get('user/:userId')
    async getUserReputation(@Param('userId') userId: string) {
      try {
        const reputation = await this.reputationService.getReputationByUserId(userId);
        return {
          status: 'success',
          data: reputation,
        };
      } catch (error) {
        throw new HttpException(
          `Failed to get reputation: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    @Post('calculate/:userId')
    async calculateUserReputation(@Param('userId') userId: string) {
      try {
        const reputation = await this.reputationService.calculateReputation(userId);
        return {
          status: 'success',
          data: reputation,
        };
      } catch (error) {
        throw new HttpException(
          `Failed to calculate reputation: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    @Get('history/:userId')
    async getReputationHistory(
      @Param('userId') userId: string,
      @Query('startDate') startDate?: string,
      @Query('endDate') endDate?: string,
    ) {
      try {
        const history = await this.reputationService.getReputationHistory(
          userId,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined,
        );
        return {
          status: 'success',
          data: history,
        };
      } catch (error) {
        throw new HttpException(
          `Failed to get reputation history: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    @Get('trends/:userId')
    async getReputationTrends(
      @Param('userId') userId: string,
      @Query('days') days?: number,
    ) {
      try {
        const trends = await this.reputationService.getReputationTrends(
          userId,
          days ? Number(days) : 30,
        );
        return {
          status: 'success',
          data: trends,
        };
      } catch (error) {
        throw new HttpException(
          `Failed to get reputation trends: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    @Put('settings')
    async updateReputationSettings(@Body() updateDto: ReputationUpdateDto) {
      try {
        const updated = await this.reputationService.updateReputationSettings(updateDto);
        return {
          status: 'success',
          data: updated,
        };
      } catch (error) {
        throw new HttpException(
          `Failed to update reputation settings: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    @Post('verify/:userId')
    async initiateVerification(
      @Param('userId') userId: string,
      @Body() verificationData: { type: string; metadata: any },
    ) {
      try {
        const verification = await this.verificationService.initiateVerification(
          userId,
          verificationData.type,
          verificationData.metadata,
        );
        return {
          status: 'success',
          data: verification,
        };
      } catch (error) {
        throw new HttpException(
          `Failed to initiate verification: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    @Post('verify/process/:verificationId')
    async processVerification(@Param('verificationId') verificationId: string) {
      try {
        const verification = await this.verificationService.processVerification(verificationId);
        return {
          status: 'success',
          data: verification,
        };
      } catch (error) {
        throw new HttpException(
          `Failed to process verification: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    @Get('badges/:userId')
    async getUserBadges(@Param('userId') userId: string) {
      try {
        const badges = await this.badgeService.getBadgesByUserId(userId);
        return {
          status: 'success',
          data: badges,
        };
      } catch (error) {
        throw new HttpException(
          `Failed to get user badges: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    @Post('badges/check/:userId')
    async checkBadgeProgress(@Param('userId') userId: string) {
      try {
        const badges = await this.badgeService.checkBadgeProgress(userId);
        return {
          status: 'success',
          data: badges,
        };
      } catch (error) {
        throw new HttpException(
          `Failed to check badge progress: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    @Get('search')
    async searchReputations(@Query() query: ReputationQueryDto) {
      // Implementation would connect to a repository search method
      // This is a placeholder for the API endpoint
      return {
        status: 'success',
        message: 'Search functionality to be implemented',
        query,
      };
    }
  
    @Get('leaderboard')
    async getReputationLeaderboard(
      @Query('limit') limit: number = 10,
      @Query('offset') offset: number = 0,
    ) {
      // Implementation would get top users by reputation
      // This is a placeholder for the API endpoint
      return {
        status: 'success',
        message: 'Leaderboard functionality to be implemented',
        params: { limit, offset },
      };
    }
  
    // Protected endpoint example
    @UseGuards(ReputationThresholdGuard)
    @Get('premium-features')
    async getPremiumFeatures() {
      return {
        status: 'success',
        message: 'Access granted to premium features',
        features: [
          'Advanced analytics',
          'Priority verification',
          'Extended history',
        ],
      };
    }
  }
  