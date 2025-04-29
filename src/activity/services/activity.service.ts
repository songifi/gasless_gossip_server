// src/activity/services/activity.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Activity } from '../entities/activity.entity';
import { ActivityTarget } from '../entities/activity-target.entity';
import { CreateActivityDto } from '../dtos/create-activity.dto';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Activity)
    private activityRepository: Repository<Activity>,
    
    @InjectRepository(ActivityTarget)
    private activityTargetRepository: Repository<ActivityTarget>,
    
    private dataSource: DataSource,
    
    @InjectQueue('feed')
    private feedQueue: Queue,
  ) {}

  async createActivity(createActivityDto: CreateActivityDto): Promise<Activity> {
    const { targets, ...activityData } = createActivityDto;
    
    // Check if we should aggregate this activity with similar recent ones
    let existingActivity: Activity | null = null;
    
    if (createActivityDto.groupKey) {
      // Look for recent similar activity for aggregation (within the last 24 hours)
      existingActivity = await this.activityRepository.findOne({
        where: {
          actorId: createActivityDto.actorId,
          type: createActivityDto.type,
          group_key: createActivityDto.groupKey,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
        order: { createdAt: 'DESC' },
      });
    }
    
    // Begin a transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      let activity: Activity;
      
      if (existingActivity) {
        // Update aggregation count on existing activity
        existingActivity.aggregation_count += 1;
        existingActivity.updatedAt = new Date();
        activity = await queryRunner.manager.save(existingActivity);
      } else {
        // Create a new activity
        const newActivity = this.activityRepository.create({
          type: activityData.type,
          actorId: activityData.actorId,
          payload: activityData.payload || {},
          is_public: activityData.isPublic ?? true,
          group_key: activityData.groupKey,
        });
        
        activity = await queryRunner.manager.save(newActivity);
        
        // Create activity targets if provided
        if (targets && targets.length > 0) {
          const activityTargets = targets.map(target => 
            this.activityTargetRepository.create({
              activityId: activity.id,
              targetType: target.targetType,
              targetId: target.targetId,
            })
          );
          
          await queryRunner.manager.save(activityTargets);
        }
      }
      
      await queryRunner.commitTransaction();
      
      // Queue the feed distribution job
      await this.feedQueue.add('distribute-activity', {
        activityId: activity.id,
      });
      
      return activity;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error.code === '23505') { // PostgreSQL unique constraint violation code
        throw new ConflictException('Activity already exists');
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getActivityById(id: string): Promise<Activity> {
    const activity = await this.activityRepository.findOne({
      where: { id },
      relations: ['targets'],
    });
    
    if (!activity) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }
    
    return activity;
  }

  async getActivitiesByActor(actorId: number, limit = 20, offset = 0): Promise<Activity[]> {
    return this.activityRepository.find({
      where: { actorId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['targets'],
    });
  }

  async getActivitiesByTarget(targetType: string, targetId: number, limit = 20, offset = 0): Promise<Activity[]> {
    const activityIds = await this.activityTargetRepository
      .createQueryBuilder('target')
      .select('target.activity_id')
      .where('target.target_type = :targetType', { targetType })
      .andWhere('target.target_id = :targetId', { targetId })
      .limit(limit)
      .offset(offset)
      .getRawMany();
    
    if (activityIds.length === 0) {
      return [];
    }
    
    return this.activityRepository.find({
      where: { id: In(activityIds.map(row => row.activity_id)) },
      order: { createdAt: 'DESC' },
      relations: ['targets'],
    });
  }

  async deleteActivity(id: string): Promise<void> {
    const result = await this.activityRepository.delete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }
  }
}
