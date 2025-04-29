import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Penalty } from '../entities/penalty.entity';
import { PenaltyType } from '../interfaces/penalty-type.enum';
import { NotificationService } from '../../notification/services/notification.service';

interface IssuePenaltyParams {
  userId: string;
  type: PenaltyType;
  reason: string;
  issuedById: string;
  duration?: number; // in hours, for temporary restrictions
  metadata?: Record<string, any>;
  isAutomated?: boolean;
}

@Injectable()
export class PenaltyService {
  constructor(
    @InjectRepository(Penalty)
    private penaltyRepository: Repository<Penalty>,
    private notificationService: NotificationService,
  ) {}

  async issuePenalty(params: IssuePenaltyParams): Promise<Penalty> {
    const { userId, type, reason, issuedById, duration, metadata, isAutomated = false } = params;

    let expiresAt: Date | null = null;
    
    if (type === PenaltyType.TEMPORARY_RESTRICTION && duration) {
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + duration);
    }

    const penalty = this.penaltyRepository.create({
      userId,
      type,
      reason,
      issuedById,
      expiresAt,
      metadata,
      isActive: true,
      isAutomated,
    });

    const savedPenalty = await this.penaltyRepository.save(penalty);

    // Notify the user about the penalty
    await this.notificationService.sendToUser(userId, {
      type: 'penalty_issued',
      title: 'Account Penalty',
      body: `A ${type} has been applied to your account: ${reason}`,
      metadata: {
        penaltyId: savedPenalty.id,
        type,
        expiresAt,
      },
    });

    return savedPenalty;
  }

  async getUserActivePenalties(userId: string): Promise<Penalty[]> {
    return this.penaltyRepository.find({
      where: [
        { userId, isActive: true, expiresAt: null },
        { userId, isActive: true, expiresAt: LessThan(new Date()) },
      ],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getUserPenaltyHistory(userId: string): Promise<Penalty[]> {
    return this.penaltyRepository.find({
      where: { userId },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async revokePenalty(id: string, moderatorId: string, reason?: string): Promise<Penalty> {
    const penalty = await this.penaltyRepository.findOneBy({ id });
    
    if (!penalty) {
      throw new Error(`Penalty with ID ${id} not found`);
    }

    penalty.isActive = false;
    
    // Add revocation metadata
    penalty.metadata = {
      ...(penalty.metadata || {}),
      revoked: {
        by: moderatorId,
        at: new Date(),
        reason,
      },
    };

    const updatedPenalty = await this.penaltyRepository.save(penalty);

    // Notify the user about the penalty revocation
    await this.notificationService.sendToUser(penalty.userId, {
      type: 'penalty_revoked',
      title: 'Penalty Revoked',
      body: `Your ${penalty.type} penalty has been revoked${reason ? `: ${reason}` : ''}`,
      metadata: {
        penaltyId: updatedPenalty.id,
        type: updatedPenalty.type,
      },
    });

    return updatedPenalty;
  }

  async cleanupExpiredPenalties(): Promise<number> {
    const result = await this.penaltyRepository.update(
      {
        isActive: true,
        expiresAt: LessThan(new Date()),
      },
      { isActive: false }
    );

    return result.affected || 0;
  }

  async hasActiveRestriction(userId: string): Promise<boolean> {
    const count = await this.penaltyRepository.count({
      where: [
        { userId, isActive: true, expiresAt: null },
        { userId, isActive: true, expiresAt: LessThan(new Date()) },
      ],
    });

    return count > 0;
  }
}
