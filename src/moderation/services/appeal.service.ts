import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appeal } from '../entities/appeal.entity';
import { PenaltyService } from './penalty.service';
import { CreateAppealDto, ReviewAppealDto } from '../dto/appeal.dto';
import { NotificationService } from '../../notification/services/notification.service';

@Injectable()
export class AppealService {
  constructor(
    @InjectRepository(Appeal)
    private appealRepository: Repository<Appeal>,
    private penaltyService: PenaltyService,
    private notificationService: NotificationService,
  ) {}

  async createAppeal(userId: string, createAppealDto: CreateAppealDto): Promise<Appeal> {
    // Check if penalty exists and belongs to the user
    const penalties = await this.penaltyService.getUserPenaltyHistory(userId);
    const penalty = penalties.find(p => p.id === createAppealDto.penaltyId);
    
    if (!penalty) {
      throw new Error('Penalty not found or does not belong to user');
    }

    // Check if an appeal already exists for this penalty
    const existingAppeal = await this.appealRepository.findOneBy({ 
      userId, 
      penaltyId: createAppealDto.penaltyId 
    });
    
    if (existingAppeal) {
      throw new Error('An appeal already exists for this penalty');
    }

    const appeal = this.appealRepository.create({
      userId,
      penaltyId: createAppealDto.penaltyId,
      reason: createAppealDto.reason,
      status: 'pending',
    });

    const savedAppeal = await this.appealRepository.save(appeal);

    // Notify moderators about new appeal
    await this.notificationService.notifyModerators({
      type: 'new_appeal',
      title: 'New Appeal Submitted',
      body: `A user has appealed a ${penalty.type} penalty`,
      priority: 'medium',
      metadata: {
        appealId: savedAppeal.id,
        penaltyId: penalty.id,
        penaltyType: penalty.type,
      },
    });

    return savedAppeal;
  }

  async reviewAppeal(
    appealId: string, 
    moderatorId: string, 
    reviewData: ReviewAppealDto
  ): Promise<Appeal> {
    const appeal = await this.appealRepository.findOne({
      where: { id: appealId },
      relations: ['penalty'],
    });
    
    if (!appeal) {
      throw new Error(`Appeal with ID ${appealId} not found`);
    }

    appeal.status = reviewData.status;
    appeal.moderatorResponse = reviewData.moderatorResponse;
    appeal.reviewedById = moderatorId;

    // If approved, revoke the penalty
    if (reviewData.status === 'approved') {
      await this.penaltyService.revokePenalty(
        appeal.penaltyId, 
        moderatorId, 
        `Appeal approved: ${reviewData.moderatorResponse}`
      );
    }

    const updatedAppeal = await this.appealRepository.save(appeal);

    // Notify the user about the appeal decision
    await this.notificationService.sendToUser(appeal.userId, {
      type: 'appeal_decision',
      title: `Appeal ${reviewData.status === 'approved' ? 'Approved' : 'Rejected'}`,
      body: reviewData.moderatorResponse,
      metadata: {
        appealId: updatedAppeal.id,
        penaltyId: appeal.penaltyId,
        status: reviewData.status,
      },
    });

    return updatedAppeal;
  }

  async getPendingAppeals(page = 1, limit = 20): Promise<[Appeal[], number]> {
    return this.appealRepository.findAndCount({
      where: { status: 'pending' },
      relations: ['user', 'penalty'],
      skip: (page - 1) * limit,
      take: limit,
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async getUserAppeals(userId: string): Promise<Appeal[]> {
    return this.appealRepository.find({
      where: { userId },
      relations: ['penalty'],
      order: {
        createdAt: 'DESC',
      },
    });
  }
}
