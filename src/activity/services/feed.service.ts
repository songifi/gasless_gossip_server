// src/activity/services/feed.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { FeedItem } from '../entities/feed-item.entity';
import { FeedSubscription } from '../entities/feed-subscription.entity';
import { Activity } from '../entities/activity.entity';
import { FeedOptions } from '../interfaces/feed-options.interface';
import { RelevanceCalculator } from '../../utils/relevance-calculator';
import { decodeCursor, encodeCursor } from '../../utils/cursor-pagination';
import { FeedResponseDto } from '../dtos/feed-response.dto';

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(FeedItem)
    private feedItemRepository: Repository<FeedItem>,
    
    @InjectRepository(FeedSubscription)
    private feedSubscriptionRepository: Repository<FeedSubscription>,
    
    @InjectRepository(Activity)
    private activityRepository: Repository<Activity>,
    
    private relevanceCalculator: RelevanceCalculator,
  ) {}

  async generateFeed(userId: number, options: FeedOptions = {}): Promise<FeedResponseDto> {
    const {
      limit = 20,
      cursor,
      includeRead = false,
      types,
    } = options;
    
    // Build the query
    const queryBuilder = this.feedItemRepository
      .createQueryBuilder('feedItem')
      .innerJoinAndSelect('feedItem.activity', 'activity')
      .innerJoinAndSelect('activity.actor', 'actor')
      .leftJoinAndSelect('activity.targets', 'targets')
      .where('feedItem.userId = :userId', { userId });
    
    // Apply cursor-based pagination
    if (cursor) {
      const { score, timestamp } = decodeCursor(cursor);
      queryBuilder.andWhere(
        '(feedItem.score < :score) OR (feedItem.score = :score AND feedItem.createdAt < :timestamp)',
        { score, timestamp }
      );
    }
    
    // Filter out read items if needed
    if (!includeRead) {
      queryBuilder.andWhere('feedItem.read = false');
    }
    
    // Filter by activity types if provided
    if (types && types.length > 0) {
      queryBuilder.andWhere('activity.type IN (:...types)', { types });
    }
    
    // Order and limit
    queryBuilder
      .orderBy('feedItem.score', 'DESC')
      .addOrderBy('feedItem.createdAt', 'DESC')
      .take(limit + 1); // Get one extra item to determine if there are more
    
    // Execute the query
    const feedItems = await queryBuilder.getMany();
    
    // Check if there are more items
    const hasMore = feedItems.length > limit;
    if (hasMore) {
      feedItems.pop(); // Remove the extra item
    }
    
    // Generate next cursor if there are more items
    let nextCursor = null;
    if (hasMore && feedItems.length > 0) {
      const lastItem = feedItems[feedItems.length - 1];
      nextCursor = encodeCursor(lastItem.score, lastItem.createdAt);
    }
    
    return {
      items: feedItems,
      nextCursor,
      hasMore,
    };
  }

  async distributeActivity(activityId: string): Promise<void> {
    const activity = await this.activityRepository.findOne({
      where: { id: activityId },
      relations: ['targets'],
    });
    
    if (!activity) {
      throw new NotFoundException(`Activity with ID ${activityId} not found`);
    }
    
    // If activity is not public, only distribute to specific targets
    if (!activity.is_public) {
      await this.distributeToTargets(activity);
      return;
    }
    
    // Find all users who follow the actor
    const subscriptions = await this.feedSubscriptionRepository.find({
      where: {
        publisherId: activity.actorId,
        active: true,
      },
    });
    
    // Calculate relevance and create feed items
    const feedItems = subscriptions.map(subscription => {
      const score = this.relevanceCalculator.calculateScore({
        actorId: activity.actorId,
        subscriberId: subscription.subscriberId,
        activityType: activity.type,
        subscriptionWeight: subscription.weight,
        timestamp: activity.createdAt,
      });
      
      return this.feedItemRepository.create({
        userId: subscription.subscriberId,
        activityId: activity.id,
        score,
      });
    });
    
    if (feedItems.length > 0) {
      await this.feedItemRepository.save(feedItems);
    }
    
    // Also distribute to specific targets
    await this.distributeToTargets(activity);
  }

  private async distributeToTargets(activity: Activity): Promise<void> {
    if (!activity.targets || activity.targets.length === 0) {
      return;
    }
    
    // Find target users
    const userTargets = activity.targets.filter(target => target.targetType === 'user');
    
    if (userTargets.length === 0) {
      return;
    }
    
    // Create feed items for target users with high relevance
    const feedItems = userTargets.map(target => {
      return this.feedItemRepository.create({
        userId: target.targetId,
        activityId: activity.id,
        score: 1.0, // High relevance score for direct targeting
      });
    });
    
    if (feedItems.length > 0) {
      await this.feedItemRepository.save(feedItems);
    }
  }

  async markFeedItemAsRead(userId: number, feedItemId: number): Promise<void> {
    const feedItem = await this.feedItemRepository.findOne({
      where: { id: feedItemId, userId },
    });
    
    if (!feedItem) {
      throw new NotFoundException(`Feed item with ID ${feedItemId} not found`);
    }
    
    feedItem.read = true;
    await this.feedItemRepository.save(feedItem);
  }

  async subscribe(subscriberId: number, publisherId: number, weight = 1.0): Promise<FeedSubscription> {
    let subscription = await this.feedSubscriptionRepository.findOne({
      where: { subscriberId, publisherId },
    });
    
    if (subscription) {
      subscription.active = true;
      subscription.weight = weight;
    } else {
      subscription = this.feedSubscriptionRepository.create({
        subscriberId,
        publisherId,
        weight,
        active: true,
      });
    }
    
    return this.feedSubscriptionRepository.save(subscription);
  }

  async unsubscribe(subscriberId: number, publisherId: number): Promise<void> {
    const subscription = await this.feedSubscriptionRepository.findOne({
      where: { subscriberId, publisherId },
    });
    
    if (subscription) {
      subscription.active = false;
      await this.feedSubscriptionRepository.save(subscription);
    }
  }
}