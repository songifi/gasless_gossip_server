import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

import { ActivityService } from '../../activity/services/activity.service';
import { UserService } from '../../user/services/user.service';

import { TrendingTopic } from '../entities/trending-topic.entity';
import { TrendingTopicData, TrendingTimeframe } from '../interfaces/trending.interface';

@Injectable()
export class TrendingService {
  private readonly logger = new Logger(TrendingService.name);
  private readonly timeframes: Record<string, TrendingTimeframe> = {
    'hour': { hours: 1, decayFactor: 0.9 },
    'day': { hours: 24, decayFactor: 0.75 },
    'week': { hours: 168, decayFactor: 0.5 },
  };

  constructor(
    @InjectRepository(TrendingTopic)
    private readonly trendingTopicRepository: Repository<TrendingTopic>,
    @InjectQueue('discovery')
    private readonly discoveryQueue: Queue,
    private readonly activityService: ActivityService,
    private readonly userService: UserService,
  ) {}

  /**
   * Get trending topics
   */
  async getTrendingTopics(
    limit: number = 10,
    timeframe: string = 'day',
  ): Promise<TrendingTopic[]> {
    return this.trendingTopicRepository.find({
      order: { score: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get personalized trending topics based on user interests
   */
  async getPersonalizedTrendingTopics(
    userId: string,
    limit: number = 10,
    timeframe: string = 'day',
  ): Promise<TrendingTopic[]> {
    // Get user interests
    const userInterests = await this.userService.getUserInterests(userId);
    
    if (userInterests.length === 0) {
      // Fall back to general trending if no interests
      return this.getTrendingTopics(limit, timeframe);
    }
    
    // Get all trending topics
    const allTrending = await this.trendingTopicRepository.find({
      order: { score: 'DESC' },
      take: limit * 3, // Get more than needed to filter
    });
    
    // Score topics based on user interests
    const scoredTopics = allTrending.map(topic => {
      // Check if topic directly matches an interest
      const isDirectMatch = userInterests.some(
        interest => topic.topic.toLowerCase().includes(interest.toLowerCase()) ||
                    interest.toLowerCase().includes(topic.topic.toLowerCase())
      );
      
      // Check if related topics match interests
      const relatedMatchScore = Object.keys(topic.relatedTopics).reduce((score, relatedTopic) => {
        const isMatch = userInterests.some(
          interest => relatedTopic.toLowerCase().includes(interest.toLowerCase()) ||
                     interest.toLowerCase().includes(relatedTopic.toLowerCase())
        );
        return isMatch ? score + topic.relatedTopics[relatedTopic] : score;
      }, 0);
      
      // Calculate personalization multiplier
      const personalizationMultiplier = isDirectMatch ? 2.0 : (relatedMatchScore > 0 ? 1.5 : 1.0);
      
      return {
        ...topic,
        personalizedScore: topic.score * personalizationMultiplier,
      };
    });
    
    // Sort by personalized score and return top results
    return scoredTopics
      .sort((a, b) => b.personalizedScore - a.personalizedScore)
      .slice(0, limit);
  }

  /**
   * Calculate trending topics
   */
  @Cron(CronExpression.EVERY_HOUR)
  async calculateTrendingTopics(): Promise<void> {
    this.logger.log('Calculating trending topics');
    
    try {
      // Queue the trending calculation job
      await this.discoveryQueue.add(
        'calculate-trending',
        {},
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      );
    } catch (error) {
      this.logger.error('Error scheduling trending calculation:', error);
    }
  }

  /**
   * Perform the actual calculation of trending topics
   */
  async performTrendingCalculation(): Promise<void> {
    try {
      // Get recent activities to analyze
      const recentActivities = await this.activityService.getRecentActivities(
        24 * 60 * 60 * 1000 // 24 hours in milliseconds
      );
      
      // Extract hashtags, topics, and keywords
      const topicMentions = this.extractTopicMentions(recentActivities);
      
      // Decay existing trending topics
      await this.decayExistingTrendingTopics();
      
      // Update or create trending topics
      for (const [topic, data] of Object.entries(topicMentions)) {
        // Skip topics with too few mentions
        if (data.mentionCount < 3) {
          continue;
        }
        
        // Check if topic already exists
        let trendingTopic = await this.trendingTopicRepository.findOne({
          where: { topic }
        });
        
        if (trendingTopic) {
          // Update existing topic
          trendingTopic.score += data.score;
          trendingTopic.mentionCount += data.mentionCount;
          trendingTopic.engagementCount += data.engagementCount;
          
          // Update related topics
          for (const [related, relatedScore] of Object.entries(data.relatedTopics)) {
            trendingTopic.relatedTopics[related] = (trendingTopic.relatedTopics[related] || 0) + relatedScore;
          }
          
          // Update hashtags
          const hashtagSet = new Set([
            ...trendingTopic.relevantHashtags,
            ...data.relevantHashtags
          ]);
          trendingTopic.relevantHashtags = Array.from(hashtagSet);
          
          await this.trendingTopicRepository.save(trendingTopic);
        } else {
          // Create new trending topic
          trendingTopic = this.trendingTopicRepository.create({
            topic,
            score: data.score,
            mentionCount: data.mentionCount,
            engagementCount: data.engagementCount,
            relatedTopics: data.relatedTopics,
            relevantHashtags: data.relevantHashtags,
          });
          
          await this.trendingTopicRepository.save(trendingTopic);
        }
      }
      
      // Clean up old trending topics that have decayed below threshold
      await this.trendingTopicRepository.delete({
        score: LessThan(0.5),
        updatedAt: LessThan(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)), // 7 days old
      });
      
    } catch (error) {
      this.logger.error('Error calculating trending topics:', error);
    }
  }

  /**
   * Extract topic mentions from activities
   */
  private extractTopicMentions(activities: any[]): Record<string, TrendingTopicData> {
    const topicMentions: Record<string, TrendingTopicData> = {};
    
    for (const activity of activities) {
      const age = Date.now() - new Date(activity.timestamp).getTime();
      const ageFactor = Math.exp(-age / (12 * 60 * 60 * 1000)); // Decay factor based on hours
      
      // Process content topics
      if (activity.content?.topics) {
        for (const topic of activity.content.topics) {
          if (!topicMentions[topic]) {
            topicMentions[topic] = {
              topic,
              score: 0,
              mentionCount: 0,
              engagementCount: 0,
              relatedTopics: {},
              relevantHashtags: [],
            };
          }
          
          // Increment counters
          topicMentions[topic].mentionCount += 1;
          topicMentions[topic].score += 1 * ageFactor;
          
          // Increment engagement
          if (activity.type === 'like' || activity.type === 'share' || activity.type === 'comment') {
            topicMentions[topic].engagementCount += 1;
            topicMentions[topic].score += 0.5 * ageFactor;
          }
          
          // Add related topics
          if (activity.content?.topics) {
            for (const relatedTopic of activity.content.topics) {
              if (relatedTopic !== topic) {
                if (!topicMentions[topic].relatedTopics[relatedTopic]) {
                  topicMentions[topic].relatedTopics[relatedTopic] = 0;
                }
                topicMentions[topic].relatedTopics[relatedTopic] += 0.5 * ageFactor;
              }
            }
          }
          
          // Add hashtags
          if (activity.content?.hashtags) {
            for (const hashtag of activity.content.hashtags) {
              if (!topicMentions[topic].relevantHashtags.includes(hashtag)) {
                topicMentions[topic].relevantHashtags.push(hashtag);
              }
            }
          }
        }
      }
      
      // Process hashtags
      if (activity.content?.hashtags) {
        for (const hashtag of activity.content.hashtags) {
          const topic = hashtag.replace('#', '');
          
          if (!topicMentions[topic]) {
            topicMentions[topic] = {
              topic,
              score: 0,
              mentionCount: 0,
              engagementCount: 0,
              relatedTopics: {},
              relevantHashtags: [hashtag],
            };
          }
          
          // Increment counters
          topicMentions[topic].mentionCount += 1;
          topicMentions[topic].score += 1.2 * ageFactor; // Hashtags get higher score
          
          // Add to relevant hashtags if not already there
          if (!topicMentions[topic].relevantHashtags.includes(hashtag)) {
            topicMentions[topic].relevantHashtags.push(hashtag);
          }
        }
      }
    }
    
    return topicMentions;
  }

  /**
   * Decay existing trending topics to give room for new ones
   */
  private async decayExistingTrendingTopics(): Promise<void> {
    const existingTopics = await this.trendingTopicRepository.find();
    
    for (const topic of existingTopics) {
      // Apply decay factor
      topic.score *= 0.75; // 25% decay every calculation
      
      await this.trendingTopicRepository.save(topic);
    }
  }
}
