import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, EntityManager } from 'typeorm';
import { UserService } from '../../user/services/user.service';
import { SocialGraphService } from '../../social-graph/services/social-graph.service';
import { ActivityService } from '../../activity/services/activity.service';

import { SearchType } from '../dto/search.dto';
import { SearchResult, SearchOptions } from '../interfaces/search.interface';
import { User } from '../../user/entities/user.entity';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly userService: UserService,
    private readonly socialGraphService: SocialGraphService,
    private readonly activityService: ActivityService,
    private readonly entityManager: EntityManager,
  ) {}

  /**
   * Perform a search based on user query
   */
  async search(
    userId: string,
    query: string,
    type: SearchType = SearchType.ALL,
    options: SearchOptions
  ): Promise<SearchResult<any>> {
    this.logger.log(`User ${userId} searching for "${query}" with type ${type}`);
    
    if (!query.trim()) {
      return {
        items: [],
        total: 0,
        query,
        type,
      };
    }

    switch (type) {
      case SearchType.USERS:
        return this.searchUsers(userId, query, options);
      case SearchType.CONTENT:
        return this.searchContent(userId, query, options);
      case SearchType.COMMUNITIES:
        return this.searchCommunities(userId, query, options);
      case SearchType.ALL:
      default:
        return this.searchAll(userId, query, options);
    }
  }

  /**
   * Search for users
   */
  private async searchUsers(
    userId: string,
    query: string,
    options: SearchOptions
  ): Promise<SearchResult<any>> {
    // Get user's social graph for connection info
    const connections = await this.socialGraphService.getUserConnections(userId);
    const connectionIds = new Set(connections.map(c => c.targetUserId));
    
    // Get user's interests for better relevance
    const userInterests = await this.userService.getUserInterests(userId);
    
    // Execute search with full-text capabilities
    const results = await this.userService.searchUsers(
      query,
      options.limit,
      options.offset,
      userInterests
    );
    
    // Enhance results with social graph data
    const enhancedResults = await Promise.all(results.items.map(async (user) => {
      const isConnection = connectionIds.has(user.id);
      
      // Get mutual connections if not direct connection
      let mutualConnections = [];
      if (!isConnection && user.id !== userId) {
        mutualConnections = await this.socialGraphService.getMutualConnections(userId, user.id);
      }
      
      return {
        ...user,
        isConnection,
        mutualConnectionCount: mutualConnections.length,
        mutualConnections: mutualConnections.slice(0, 3),
      };
    }));
    
    return {
      items: enhancedResults,
      total: results.total,
      query,
      type: SearchType.USERS,
    };
  }

  /**
   * Search for content
   */
  private async searchContent(
    userId: string,
    query: string,
    options: SearchOptions
  ): Promise<SearchResult<any>> {
    // Get user's interests for better relevance
    const userInterests = await this.userService.getUserInterests(userId);
    
    // Execute search with full-text capabilities
    const results = await this.activityService.searchContent(
      query,
      options.limit,
      options.offset,
      userInterests
    );
    
    // Enhance results with engagement data
    const enhancedResults = await Promise.all(results.items.map(async (content) => {
      const userEngagement = await this.activityService.getUserEngagementWithContent(userId, content.id);
      const connectionEngagements = await this.activityService.getConnectionsEngagementWithContent(
        userId,
        content.id
      );
      
      return {
        ...content,
        userEngagement,
        connectionEngagements: connectionEngagements.slice(0, 3),
        engagementCount: connectionEngagements.length,
      };
    }));
    
    return {
      items: enhancedResults,
      total: results.total,
      query,
      type: SearchType.CONTENT,
    };
  }

  /**
   * Search for communities
   */
  private async searchCommunities(
    userId: string,
    query: string,
    options: SearchOptions
  ): Promise<SearchResult<any>> {
    // Get user's interests for better relevance
    const userInterests = await this.userService.getUserInterests(userId);
    
    // Get user's communities
    const userCommunities = await this.socialGraphService.getUserCommunities(userId);
    const userCommunityIds = new Set(userCommunities.map(c => c.id));
    
    // Execute search
    const results = await this.socialGraphService.searchCommunities(
      query,
      options.limit,
      options.offset,
      userInterests
    );
    
    // Enhance results with member data
    const enhancedResults = await Promise.all(results.items.map(async (community) => {
      const isMember = userCommunityIds.has(community.id);
      const connectionMembers = await this.socialGraphService.getConnectionMembersInCommunity(
        userId,
        community.id
      );
      
      return {
        ...community,
        isMember,
        connectionMemberCount: connectionMembers.length,
        connectionMembers: connectionMembers.slice(0, 3),
      };
    }));
    
    return {
      items: enhancedResults,
      total: results.total,
      query,
      type: SearchType.COMMUNITIES,
    };
  }

  /**
   * Search across all types
   */
  private async searchAll(
    userId: string,
    query: string,
    options: SearchOptions
  ): Promise<SearchResult<any>> {
    // Split limits for different entity types
    const userLimit = Math.max(3, Math.floor(options.limit * 0.3));
    const contentLimit = Math.max(3, Math.floor(options.limit * 0.4));
    const communityLimit = Math.max(3, Math.floor(options.limit * 0.3));
    
    // Execute searches in parallel
    const [userResults, contentResults, communityResults] = await Promise.all([
      this.searchUsers(userId, query, { ...options, limit: userLimit }),
      this.searchContent(userId, query, { ...options, limit: contentLimit }),
      this.searchCommunities(userId, query, { ...options, limit: communityLimit }),
    ]);
    
    // Combine results
    return {
      items: {
        users: userResults.items,
        content: contentResults.items,
        communities: communityResults.items,
      },
      total: userResults.total + contentResults.total + communityResults.total,
      query,
      type: SearchType.ALL,
    };
  }
}
