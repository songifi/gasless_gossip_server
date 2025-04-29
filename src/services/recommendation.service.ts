import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

import { UserService } from '../../user/services/user.service';
import { SocialGraphService } from '../../social-graph/services/social-graph.service';
import { ActivityService } from '../../activity/services/activity.service';

import { Recommendation, RecommendationType } from '../entities/recommendation.entity';
import { RecommendationCandidate, RecommendationConfig } from '../interfaces/recommendation.interface';
import { calculateRelevanceScore } from '../utils/relevance-scoring.util';
import { analyzeSocialGraph } from '../utils/social-graph-analysis.util';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private readonly defaultConfig: RecommendationConfig = {
    socialGraphWeight: 0.4,
    interestSimilarityWeight: 0.3,
    activitySimilarityWeight: 0.2,
    engagementWeight: 0.1,
    recencyFactor: 0.8,
  };

  constructor(
    @InjectRepository(Recommendation)
    private readonly recommendationRepository: Repository<Recommendation>,
    @InjectQueue('discovery')
    private readonly discoveryQueue: Queue,
    private readonly userService: UserService,
    private readonly socialGraphService: SocialGraphService,
    private readonly activityService: ActivityService,
  ) {}

  /**
   * Get recommendations for a user with optional filtering by type
   */
  async getRecommendationsForUser(
    userId: string,
    type?: RecommendationType,
    limit: number = 10,
    offset: number = 0,
  ): Promise<Recommendation[]> {
    const query = this.recommendationRepository.createQueryBuilder('recommendation')
      .where('recommendation.userId = :userId', { userId })
      .andWhere('recommendation.dismissed = :dismissed', { dismissed: false })
      .orderBy('recommendation.score', 'DESC')
      .limit(limit)
      .offset(offset);

    if (type) {
      query.andWhere('recommendation.type = :type', { type });
    }

    return query.getMany();
  }

  /**
   * Dismiss a recommendation for a user
   */
  async dismissRecommendation(userId: string, recommendationId: string): Promise<void> {
    await this.recommendationRepository.update(
      { id: recommendationId, userId },
      { dismissed: true }
    );
  }

  /**
   * Queue a job to refresh recommendations for a user
   */
  async refreshRecommendationsForUser(userId: string): Promise<void> {
    await this.discoveryQueue.add(
      'calculate-recommendations',
      { userId },
      { 
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      }
    );
  }

  /**
   * Calculate and store people recommendations for a user
   */
  async calculatePeopleRecommendations(userId: string): Promise<void> {
    try {
      const user = await this.userService.findById(userId);
      if (!user) {
        this.logger.warn(`User ${userId} not found, skipping people recommendations`);
        return;
      }

      // Get candidates from social graph analysis
      const candidates = await this.getPeopleRecommendationCandidates(userId);
      
      // Store new recommendations and update existing ones
      await this.storeRecommendations(userId, candidates);

    } catch (error) {
      this.logger.error(`Error calculating people recommendations for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate and store content recommendations for a user
   */
  async calculateContentRecommendations(userId: string): Promise<void> {
    try {
      // Get user interests and activity
      const user = await this.userService.findById(userId);
      if (!user) {
        this.logger.warn(`User ${userId} not found, skipping content recommendations`);
        return;
      }

      // Get candidates based on interests and social graph
      const candidates = await this.getContentRecommendationCandidates(userId);
      
      // Store new recommendations and update existing ones
      await this.storeRecommendations(userId, candidates);

    } catch (error) {
      this.logger.error(`Error calculating content recommendations for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate and store community recommendations for a user
   */
  async calculateCommunityRecommendations(userId: string): Promise<void> {
    try {
      // Get user interests and activity
      const user = await this.userService.findById(userId);
      if (!user) {
        this.logger.warn(`User ${userId} not found, skipping community recommendations`);
        return;
      }

      // Get candidates based on interests and connections
      const candidates = await this.getCommunityRecommendationCandidates(userId);
      
      // Store new recommendations and update existing ones
      await this.storeRecommendations(userId, candidates);

    } catch (error) {
      this.logger.error(`Error calculating community recommendations for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Store recommendation candidates for a user
   */
  private async storeRecommendations(
    userId: string, 
    candidates: RecommendationCandidate[],
  ): Promise<void> {
    // Get existing recommendations to update
    const existingRecommendations = await this.recommendationRepository.find({
      where: {
        userId,
        targetId: In(candidates.map(c => c.targetId)),
        dismissed: false,
      }
    });

    const existingMap = new Map(
      existingRecommendations.map(r => [`${r.targetId}-${r.type}`, r])
    );

    // Prepare batch operations
    const toUpdate: Recommendation[] = [];
    const toInsert: Recommendation[] = [];

    for (const candidate of candidates) {
      const key = `${candidate.targetId}-${candidate.type}`;
      const existing = existingMap.get(key);

      if (existing) {
        // Update existing recommendation
        existing.score = candidate.score;
        existing.metadata = {
          ...existing.metadata,
          ...candidate.metadata,
          reasons: candidate.reasons,
          updatedAt: new Date(),
        };
        toUpdate.push(existing);
      } else {
        // Create new recommendation
        const newRecommendation = this.recommendationRepository.create({
          userId,
          targetId: candidate.targetId,
          type: candidate.type,
          score: candidate.score,
          metadata: {
            ...candidate.metadata,
            reasons: candidate.reasons,
            createdAt: new Date(),
          },
        });
        toInsert.push(newRecommendation);
      }
    }

    // Execute batch operations
    if (toUpdate.length > 0) {
      await this.recommendationRepository.save(toUpdate);
    }
    
    if (toInsert.length > 0) {
      await this.recommendationRepository.save(toInsert);
    }
  }

  /**
   * Get people recommendation candidates for a user
   */
  private async getPeopleRecommendationCandidates(userId: string): Promise<RecommendationCandidate[]> {
    // Get social graph data
    const socialGraphData = await this.socialGraphService.getUserSocialGraph(userId);
    
    // Get user interests
    const userInterests = await this.userService.getUserInterests(userId);
    
    // Get user's connections
    const connections = await this.socialGraphService.getUserConnections(userId);
    const connectionIds = new Set(connections.map(c => c.targetUserId));
    
    // Analyze social graph for friend recommendations
    const friendOfFriendCandidates = await analyzeSocialGraph(
      userId,
      socialGraphData,
      connectionIds
    );
    
    // Get interest-based user recommendations
    const interestBasedCandidates = await this.userService.findUsersByInterests(
      userInterests,
      20,
      Array.from(connectionIds).concat(userId)
    );
    
    // Combine and score candidates
    const candidates: RecommendationCandidate[] = [];
    
    // Add friend-of-friend candidates
    for (const candidate of friendOfFriendCandidates) {
      const candidateInterests = await this.userService.getUserInterests(candidate.id);
      const interestSimilarity = this.calculateInterestSimilarity(userInterests, candidateInterests);
      
      const score = calculateRelevanceScore({
        socialGraphFactor: candidate.mutualConnections / 10,
        interestSimilarity,
        recency: 1, // Maximum recency for new recommendations
      }, this.defaultConfig);
      
      candidates.push({
        targetId: candidate.id,
        type: RecommendationType.PERSON,
        score,
        metadata: {
          mutualConnections: candidate.mutualConnections,
          mutualConnectionsList: candidate.mutualConnectionIds?.slice(0, 5),
          interestSimilarity,
        },
        reasons: [
          {
            type: 'mutualConnections',
            description: `${candidate.mutualConnections} mutual connections`,
            weight: 0.6,
          },
          {
            type: 'interestSimilarity',
            description: `${Math.round(interestSimilarity * 100)}% similar interests`,
            weight: 0.4,
          },
        ],
      });
    }
    
    // Add interest-based candidates
    for (const candidate of interestBasedCandidates) {
      if (candidates.some(c => c.targetId === candidate.id)) {
        continue; // Skip if already added from friend-of-friend
      }
      
      const interestSimilarity = candidate.similarityScore;
      const score = calculateRelevanceScore({
        socialGraphFactor: 0,
        interestSimilarity,
        recency: 1, // Maximum recency for new recommendations
      }, this.defaultConfig);
      
      candidates.push({
        targetId: candidate.id,
        type: RecommendationType.PERSON,
        score,
        metadata: {
          interestSimilarity,
          sharedInterests: candidate.sharedInterests,
        },
        reasons: [
          {
            type: 'interestSimilarity',
            description: `${Math.round(interestSimilarity * 100)}% similar interests`,
            weight: 1.0,
          },
        ],
      });
    }
    
    // Sort by score and limit to top 50
    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
  }

  /**
   * Get content recommendation candidates for a user
   */
  private async getContentRecommendationCandidates(userId: string): Promise<RecommendationCandidate[]> {
    // Get user interests
    const userInterests = await this.userService.getUserInterests(userId);
    
    // Get user's recent activity
    const userActivity = await this.activityService.getUserRecentActivity(userId);
    
    // Get user's connections and their engaged content
    const connections = await this.socialGraphService.getUserConnections(userId);
    const connectionIds = connections.map(c => c.targetUserId);
    
    // Get connection's recent engagements
    const connectionsActivity = await this.activityService.getMultipleUsersRecentActivity(
      connectionIds,
      20
    );
    
    // Get popular content that matches user interests
    const popularContent = await this.activityService.getPopularContentByInterests(
      userInterests,
      20
    );
    
    // Combine and score candidates
    const candidates: RecommendationCandidate[] = [];
    const seenContentIds = new Set(userActivity.map(a => a.contentId));
    
    // Add content from connections
    for (const activity of connectionsActivity) {
      if (seenContentIds.has(activity.contentId)) {
        continue; // Skip content user has already interacted with
      }
      seenContentIds.add(activity.contentId);
      
      const contentDetails = await this.activityService.getContentDetails(activity.contentId);
      const interestMatch = this.calculateInterestContentMatch(userInterests, contentDetails.topics);
      
      const engagingUsers = connectionIds.filter(id => 
        connectionsActivity.some(a => a.userId === id && a.contentId === activity.contentId)
      );
      
      const score = calculateRelevanceScore({
        socialGraphFactor: engagingUsers.length / connectionIds.length,
        interestSimilarity: interestMatch,
        recency: this.calculateRecencyFactor(activity.timestamp),
      }, this.defaultConfig);
      
      candidates.push({
        targetId: activity.contentId,
        type: RecommendationType.CONTENT,
        score,
        metadata: {
          contentType: contentDetails.type,
          engagingConnections: engagingUsers.length,
          interestMatch,
        },
        reasons: [
          {
            type: 'socialEngagement',
            description: `Engaged by ${engagingUsers.length} of your connections`,
            weight: 0.5,
          },
          {
            type: 'interestMatch',
            description: `Matches your interests in ${contentDetails.topics.filter(topic => 
              userInterests.some(i => i.toLowerCase() === topic.toLowerCase())
            ).join(', ')}`,
            weight: 0.5,
          },
        ],
      });
    }
    
    // Add interest-based popular content
    for (const content of popularContent) {
      if (seenContentIds.has(content.id)) {
        continue; // Skip content user has already interacted with or already added
      }
      seenContentIds.add(content.id);
      
      const interestMatch = this.calculateInterestContentMatch(userInterests, content.topics);
      
      const score = calculateRelevanceScore({
        socialGraphFactor: 0.1, // Small base factor for popularity
        interestSimilarity: interestMatch,
        recency: this.calculateRecencyFactor(content.publishedAt),
      }, this.defaultConfig);
      
      candidates.push({
        targetId: content.id,
        type: RecommendationType.CONTENT,
        score,
        metadata: {
          contentType: content.type,
          popularity: content.engagementCount,
          interestMatch,
        },
        reasons: [
          {
            type: 'popularity',
            description: `Popular content with ${content.engagementCount} engagements`,
            weight: 0.3,
          },
          {
            type: 'interestMatch',
            description: `Matches your interests in ${content.topics.filter(topic => 
              userInterests.some(i => i.toLowerCase() === topic.toLowerCase())
            ).join(', ')}`,
            weight: 0.7,
          },
        ],
      });
    }
    
    // Sort by score and limit to top 50
    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
  }

  /**
   * Get community recommendation candidates for a user
   */
  private async getCommunityRecommendationCandidates(userId: string): Promise<RecommendationCandidate[]> {
    // Get user interests
    const userInterests = await this.userService.getUserInterests(userId);
    
    // Get user's connections and their communities
    const connections = await this.socialGraphService.getUserConnections(userId);
    const connectionIds = connections.map(c => c.targetUserId);
    
    // Get communities user is already part of
    const userCommunities = await this.socialGraphService.getUserCommunities(userId);
    const userCommunityIds = new Set(userCommunities.map(c => c.id));
    
    // Get connection's communities
    const connectionCommunities = await this.socialGraphService.getMultipleUsersCommunities(connectionIds);
    
    // Get communities by interests
    const interestCommunities = await this.socialGraphService.getCommunitiesByInterests(userInterests);
    
    // Combine and score candidates
    const candidates: RecommendationCandidate[] = [];
    
    // Process connection community candidates
    const communityMemberCounts = new Map<string, number>();
    
    for (const community of connectionCommunities) {
      if (userCommunityIds.has(community.id)) {
        continue; // Skip communities user is already in
      }
      
      const count = communityMemberCounts.get(community.id) || 0;
      communityMemberCounts.set(community.id, count + 1);
    }
    
    for (const [communityId, memberCount] of communityMemberCounts.entries()) {
      const community = connectionCommunities.find(c => c.id === communityId);
      const interestMatch = this.calculateInterestContentMatch(userInterests, community.topics);
      
      const score = calculateRelevanceScore({
        socialGraphFactor: memberCount / connectionIds.length,
        interestSimilarity: interestMatch,
        recency: 0.8, // Base recency factor for communities
      }, this.defaultConfig);
      
      candidates.push({
        targetId: communityId,
        type: RecommendationType.COMMUNITY,
        score,
        metadata: {
          name: community.name,
          connectionsInCommunity: memberCount,
          memberCount: community.memberCount,
          interestMatch,
        },
        reasons: [
          {
            type: 'connections',
            description: `${memberCount} of your connections are members`,
            weight: 0.6,
          },
          {
            type: 'interestMatch',
            description: `Matches your interests in ${community.topics.filter(topic => 
              userInterests.some(i => i.toLowerCase() === topic.toLowerCase())
            ).join(', ')}`,
            weight: 0.4,
          },
        ],
      });
    }
    
    // Add interest-based communities
    for (const community of interestCommunities) {
      if (userCommunityIds.has(community.id) || 
          candidates.some(c => c.targetId === community.id)) {
        continue; // Skip communities user is already in or already added
      }
      
      const interestMatch = this.calculateInterestContentMatch(userInterests, community.topics);
      
      const score = calculateRelevanceScore({
        socialGraphFactor: 0.1, // Small base factor for community size
        interestSimilarity: interestMatch,
        recency: 0.7, // Slightly lower recency for interest-only matches
      }, this.defaultConfig);
      
      candidates.push({
        targetId: community.id,
        type: RecommendationType.COMMUNITY,
        score,
        metadata: {
          name: community.name,
          memberCount: community.memberCount,
          interestMatch,
        },
        reasons: [
          {
            type: 'interestMatch',
            description: `Matches your interests in ${community.topics.filter(topic => 
              userInterests.some(i => i.toLowerCase() === topic.toLowerCase())
            ).join(', ')}`,
            weight: 1.0,
          },
        ],
      });
    }
    
    // Sort by score and limit to top 30
    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);
  }

  /**
   * Calculate similarity between two interest sets
   */
  private calculateInterestSimilarity(interests1: string[], interests2: string[]): number {
    const set1 = new Set(interests1.map(i => i.toLowerCase()));
    const set2 = new Set(interests2.map(i => i.toLowerCase()));
    
    if (set1.size === 0 || set2.size === 0) {
      return 0;
    }
    
    let intersectionCount = 0;
    for (const interest of set1) {
      if (set2.has(interest)) {
        intersectionCount++;
      }
    }
    
    return intersectionCount / Math.sqrt(set1.size * set2.size);
  }

  /**
   * Calculate how well content matches user interests
   */
  private calculateInterestContentMatch(interests: string[], contentTopics: string[]): number {
    const userSet = new Set(interests.map(i => i.toLowerCase()));
    const contentSet = new Set(contentTopics.map(t => t.toLowerCase()));
    
    if (userSet.size === 0 || contentSet.size === 0) {
      return 0;
    }
    
    let matchCount = 0;
    for (const topic of contentSet) {
      if (userSet.has(topic)) {
        matchCount++;
      }
    }
    
    // We're more interested in what percentage of the content topics match
    return matchCount / contentSet.size;
  }

  /**
   * Calculate recency factor based on timestamp
   */
  private calculateRecencyFactor(timestamp: Date): number {
    const now = new Date();
    const ageInHours = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
    
    // Decay function: starts at 1.0 and approaches 0 over time
    // After 7 days (168 hours), recency factor is about 0.3
    return Math.exp(-ageInHours / 72);
  }
}
