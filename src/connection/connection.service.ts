// src/connection/connection.service.ts
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConnectionRepository } from './repositories/connection.repository';
import { BlockRepository } from './repositories/block.repository';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { ConnectionQueryDto } from './dto/connection-query.dto';
import { Connection } from './entities/connection.entity';
import { Block } from './entities/block.entity';
import { ConnectionStatus } from './enums/connection-status.enum';
import { ConnectionType } from './enums/connection-type.enum';
import { PrivacySetting } from './enums/privacy-setting.enum';
import { UserService } from '../user/user.service';
import { NotificationService } from '../notification/notification.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRedis } from '@nestjs/redis';
import Redis from 'ioredis';

@Injectable()
export class ConnectionService {
  private readonly CACHE_TTL = 3600; // 1 hour in seconds

  constructor(
    private readonly connectionRepository: ConnectionRepository,
    private readonly blockRepository: BlockRepository,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async createConnection(
    userId: string,
    createConnectionDto: CreateConnectionDto
  ): Promise<Connection> {
    const { addresseeId, type, message } = createConnectionDto;

    // Validate users exist
    const requester = await this.userService.findById(userId);
    const addressee = await this.userService.findById(addresseeId);
    
    if (!requester || !addressee) {
      throw new NotFoundException('User not found');
    }

    // Prevent self connections
    if (userId === addresseeId) {
      throw new BadRequestException('Cannot connect with yourself');
    }

    // Check for blocks
    const isBlocked = await this.blockRepository.isBlocked(userId, addresseeId);
    if (isBlocked) {
      throw new ForbiddenException('Cannot create connection due to a block');
    }

    // Check for existing connection
    const existingConnection = await this.connectionRepository.findBetweenUsers(userId, addresseeId);
    
    if (existingConnection) {
      // Handle case where connection already exists
      if (existingConnection.status === ConnectionStatus.ACCEPTED) {
        throw new ConflictException('Connection already exists');
      }
      
      // If there's a pending request from the other user, auto-accept it
      if (existingConnection.requesterId === addresseeId && 
          existingConnection.status === ConnectionStatus.PENDING &&
          type === ConnectionType.FRIENDSHIP) {
        return this.acceptConnection(existingConnection.id, userId);
      }
      
      // If user is trying to send another request
      throw new ConflictException('Connection request already pending');
    }

    // Create new connection
    const connection = await this.connectionRepository.create({
      requesterId: userId,
      addresseeId,
      requester,
      addressee,
      type,
      status: type === ConnectionType.FOLLOW ? ConnectionStatus.ACCEPTED : ConnectionStatus.PENDING,
      metadata: message ? { message } : null
    });

    // Send notification
    if (type === ConnectionType.FRIENDSHIP) {
      await this.notificationService.create({
        userId: addresseeId,
        type: 'connection_request',
        data: {
          connectionId: connection.id,
          requesterId: userId,
          requesterName: requester.username
        }
      });
    } else if (type === ConnectionType.FOLLOW) {
      await this.notificationService.create({
        userId: addresseeId,
        type: 'new_follower',
        data: {
          connectionId: connection.id,
          followerId: userId,
          followerName: requester.username
        }
      });
    }

    // Emit event
    this.eventEmitter.emit('connection.created', connection);

    // Invalidate cache
    await this.invalidateConnectionCache(userId);
    await this.invalidateConnectionCache(addresseeId);

    return connection;
  }

  async getConnections(
    userId: string,
    queryParams: ConnectionQueryDto
  ): Promise<[Connection[], number]> {
    // Try to get from cache first
    const cacheKey = `connections:${userId}:${JSON.stringify(queryParams)}`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const [connections, count] = await this.connectionRepository.findByUserWithFilters(
      userId,
      queryParams
    );

    // Set the current user ID for proper DTO transformation
    connections.forEach(connection => {
      (connection as any).currentUserId = userId;
    });

    // Cache results
    await this.redis.set(
      cacheKey,
      JSON.stringify([connections, count]),
      'EX',
      this.CACHE_TTL
    );

    return [connections, count];
  }

  async getConnectionById(userId: string, connectionId: string): Promise<Connection> {
    const connection = await this.connectionRepository.findById(connectionId);
    
    if (!connection) {
      throw new NotFoundException('Connection not found');
    }
    
    // Check if user is part of the connection
    if (connection.requesterId !== userId && connection.addresseeId !== userId) {
      throw new ForbiddenException('Access denied to this connection');
    }
    
    // Set the current user ID for proper DTO transformation
    (connection as any).currentUserId = userId;
    
    return connection;
  }

  async getConnectionRequests(userId: string): Promise<Connection[]> {
    const cacheKey = `connection_requests:${userId}`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const requests = await this.connectionRepository.findRequestsForUser(userId);
    
    // Set the current user ID for proper DTO transformation
    requests.forEach(request => {
      (request as any).currentUserId = userId;
    });

    // Cache results
    await this.redis.set(
      cacheKey,
      JSON.stringify(requests),
      'EX',
      this.CACHE_TTL
    );
    
    return requests;
  }

  async getFriends(userId: string): Promise<Connection[]> {
    const cacheKey = `friends:${userId}`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const friends = await this.connectionRepository.findFriends(userId);
    
    // Set the current user ID for proper DTO transformation
    friends.forEach(friend => {
      (friend as any).currentUserId = userId;
    });

    // Cache results
    await this.redis.set(
      cacheKey,
      JSON.stringify(friends),
      'EX',
      this.CACHE_TTL
    );
    
    return friends;
  }

  async getFollowers(userId: string): Promise<Connection[]> {
    const cacheKey = `followers:${userId}`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const followers = await this.connectionRepository.findFollowers(userId);
    
    // Set the current user ID for proper DTO transformation
    followers.forEach(follower => {
      (follower as any).currentUserId = userId;
    });

    // Cache results
    await this.redis.set(
      cacheKey,
      JSON.stringify(followers),
      'EX',
      this.CACHE_TTL
    );
    
    return followers;
  }

  async getFollowing(userId: string): Promise<Connection[]> {
    const cacheKey = `following:${userId}`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const following = await this.connectionRepository.findFollowing(userId);
    
    // Set the current user ID for proper DTO transformation
    following.forEach(follow => {
      (follow as any).currentUserId = userId;
    });

    // Cache results
    await this.redis.set(
      cacheKey,
      JSON.stringify(following),
      'EX',
      this.CACHE_TTL
    );
    
    return following;
  }

  async acceptConnection(connectionId: string, userId: string): Promise<Connection> {
    const connection = await this.connectionRepository.findById(connectionId);
    
    if (!connection) {
      throw new NotFoundException('Connection request not found');
    }
    
    // Only addressee can accept the request
    if (connection.addresseeId !== userId) {
      throw new ForbiddenException('Only the request recipient can accept it');
    }
    
    // Only pending requests can be accepted
    if (connection.status !== ConnectionStatus.PENDING) {
      throw new BadRequestException('This request cannot be accepted');
    }
    
    // Update status
    const updatedConnection = await this.connectionRepository.updateStatus(
      connectionId,
      ConnectionStatus.ACCEPTED
    );
    
    // Send notification
    await this.notificationService.create({
      userId: connection.requesterId,
      type: 'connection_accepted',
      data: {
        connectionId,
        addresseeId: userId,
        addresseeName: connection.addressee.username
      }
    });
    
    // Emit event
    this.eventEmitter.emit('connection.accepted', updatedConnection);
    
    // Invalidate cache
    await this.invalidateConnectionCache(connection.requesterId);
    await this.invalidateConnectionCache(connection.addresseeId);
    
    return updatedConnection;
  }

  async rejectConnection(connectionId: string, userId: string): Promise<Connection> {
    const connection = await this.connectionRepository.findById(connectionId);
    
    if (!connection) {
      throw new NotFoundException('Connection request not found');
    }
    
    // Only addressee can reject the request
    if (connection.addresseeId !== userId) {
      throw new ForbiddenException('Only the request recipient can reject it');
    }
    
    // Only pending requests can be rejected
    if (connection.status !== ConnectionStatus.PENDING) {
      throw new BadRequestException('This request cannot be rejected');
    }
    
    // Update status
    const updatedConnection = await this.connectionRepository.updateStatus(
      connectionId,
      ConnectionStatus.REJECTED
    );
    
    // Emit event
    this.eventEmitter.emit('connection.rejected', updatedConnection);
    
    // Invalidate cache
    await this.invalidateConnectionCache(connection.requesterId);
    await this.invalidateConnectionCache(connection.addresseeId);
    
    return updatedConnection;
  }

  async updateConnection(
    connectionId: string,
    userId: string,
    updateConnectionDto: UpdateConnectionDto
  ): Promise<Connection> {
    const connection = await this.connectionRepository.findById(connectionId);
    
    if (!connection) {
      throw new NotFoundException('Connection not found');
    }
    
    // Verify user is part of the connection
    if (connection.requesterId !== userId && connection.addresseeId !== userId) {
      throw new ForbiddenException('Access denied to this connection');
    }
    
    let updatedConnection = connection;
    
    // Handle status updates
    if (updateConnectionDto.status) {
      // Only addressee can update status
      if (connection.addresseeId !== userId) {
        throw new ForbiddenException('Only the request recipient can update status');
      }
      
      // Only pending requests can have status changed
      if (connection.status !== ConnectionStatus.PENDING) {
        throw new BadRequestException('Status cannot be updated for this connection');
      }
      
      updatedConnection = await this.connectionRepository.updateStatus(
        connectionId,
        updateConnectionDto.status
      );
      
      // Send notification for accepted connections
      if (updateConnectionDto.status === ConnectionStatus.ACCEPTED) {
        await this.notificationService.create({
          userId: connection.requesterId,
          type: 'connection_accepted',
          data: {
            connectionId,
            addresseeId: userId,
            addresseeName: connection.addressee.username
          }
        });
      }
      
      // Emit events
      if (updateConnectionDto.status === ConnectionStatus.ACCEPTED) {
        this.eventEmitter.emit('connection.accepted', updatedConnection);
      } else if (updateConnectionDto.status === ConnectionStatus.REJECTED) {
        this.eventEmitter.emit('connection.rejected', updatedConnection);
      }
    }
    
    // Handle favorite toggle
    if (updateConnectionDto.isFavorite !== undefined) {
      updatedConnection = await this.connectionRepository.toggleFavorite(
        connectionId,
        updateConnectionDto.isFavorite
      );
    }
    
    // Invalidate cache
    await this.invalidateConnectionCache(connection.requesterId);
    await this.invalidateConnectionCache(connection.addresseeId);
    
    return updatedConnection;
  }

  async removeConnection(connectionId: string, userId: string): Promise<void> {
    const connection = await this.connectionRepository.findById(connectionId);
    
    if (!connection) {
      throw new NotFoundException('Connection not found');
    }
    
    // Verify user is part of the connection
    if (connection.requesterId !== userId && connection.addresseeId !== userId) {
      throw new ForbiddenException('Access denied to this connection');
    }
    
    // Remove connection
    await this.connectionRepository.remove(connectionId);
    
    // Emit event
    this.eventEmitter.emit('connection.removed', connection);
    
    // Invalidate cache
    await this.invalidateConnectionCache(connection.requesterId);
    await this.invalidateConnectionCache(connection.addresseeId);
  }

  async blockUser(userId: string, blockUserDto: BlockUserDto): Promise<Block> {
    const { userId: blockedId, reason } = blockUserDto;
    
    // Prevent self blocks
    if (userId === blockedId) {
      throw new BadRequestException('Cannot block yourself');
    }
    
    // Check if users exist
    const user = await this.userService.findById(userId);
    const blockedUser = await this.userService.findById(blockedId);
    
    if (!user || !blockedUser) {
      throw new NotFoundException('User not found');
    }
    
    // Check if already blocked
    const existingBlock = await this.blockRepository.findByUsers(userId, blockedId);
    if (existingBlock) {
      throw new ConflictException('User is already blocked');
    }
    
    // Create block
    const block = await this.blockRepository.create({
      userId,
      blockedId,
      user,
      blocked: blockedUser,
      reason
    });
    
    // Remove any existing connections between the users
    const connection = await this.connectionRepository.findBetweenUsers(userId, blockedId);
    if (connection) {
      await this.connectionRepository.remove(connection.id);
    }
    
    // Emit event
    this.eventEmitter.emit('user.blocked', block);
    
    // Invalidate cache
    await this.invalidateConnectionCache(userId);
    await this.invalidateConnectionCache(blockedId);
    
    return block;
  }

  async unblockUser(userId: string, blockedId: string): Promise<void> {
    // Check if block exists
    const block = await this.blockRepository.findByUsers(userId, blockedId);
    if (!block) {
      throw new NotFoundException('Block not found');
    }
    
    // Remove block
    await this.blockRepository.removeBlock(userId, blockedId);
    
    // Emit event
    this.eventEmitter.emit('user.unblocked', { userId, blockedId });
    
    // Invalidate cache
    await this.invalidateConnectionCache(userId);
    await this.invalidateConnectionCache(blockedId);
  }

  async getBlockedUsers(userId: string): Promise<Block[]> {
    const cacheKey = `blocked_users:${userId}`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    
    const blocks = await this.blockRepository.findAllByUser(userId);
    
    // Cache results
    await this.redis.set(
      cacheKey,
      JSON.stringify(blocks),
      'EX',
      this.CACHE_TTL
    );
    
    return blocks;
  }

  async isBlocked(userId: string, otherUserId: string): Promise<boolean> {
    return this.blockRepository.isBlocked(userId, otherUserId);
  }

  async updateConnectionStrength(connectionId: string, interactions: number): Promise<Connection> {
    const connection = await this.connectionRepository.findById(connectionId);
    
    if (!connection) {
      throw new NotFoundException('Connection not found');
    }
    
    // Calculate new strength based on interactions
    // This is a simplified example - in a real system, you might use more complex algorithms
    const currentStrength = connection.strength || 0;
    const newStrength = Math.min(100, currentStrength + (interactions * 0.1));
    
    // Update connection strength
    const updatedConnection = await this.connectionRepository.updateConnectionStrength(
      connectionId,
      newStrength
    );
    
    // Invalidate cache
    await this.invalidateConnectionCache(connection.requesterId);
    await this.invalidateConnectionCache(connection.addresseeId);
    
    return updatedConnection;
  }

  async calculateConnectionStrength(userId1: string, userId2: string, interactions: number): Promise<number> {
    const connection = await this.connectionRepository.findBetweenUsers(userId1, userId2);
    
    if (!connection) {
      return 0;
    }
    
    // Get existing strength
    const currentStrength = connection.strength || 0;
    
    // Calculate new strength based on interactions
    // This is a simplified example - in a real system, you might use more complex algorithms
    const newStrength = Math.min(100, currentStrength + (interactions * 0.1));
    
    // Update connection strength
    await this.connectionRepository.updateConnectionStrength(
      connection.id,
      newStrength
    );
    
    // Invalidate cache
    await this.invalidateConnectionCache(userId1);
    await this.invalidateConnectionCache(userId2);
    
    return newStrength;
  }

  async checkConnectionVisibility(
    userId: string,
    targetUserId: string,
    viewerId: string
  ): Promise<boolean> {
    // Get user's privacy settings
    const user = await this.userService.findById(targetUserId);
    const privacySetting = user.settings?.connectionPrivacy || PrivacySetting.PUBLIC;
    
    // Public connections are visible to everyone
    if (privacySetting === PrivacySetting.PUBLIC) {
      return true;
    }
    
    // Own connections are always visible to self
    if (targetUserId === viewerId) {
      return true;
    }
    
    // For CONNECTIONS privacy level, check if viewer is connected to target
    if (privacySetting === PrivacySetting.CONNECTIONS) {
      const connection = await this.connectionRepository.findBetweenUsers(targetUserId, viewerId);
      return !!(connection && connection.status === ConnectionStatus.ACCEPTED);
    }
    
    // For PRIVATE, only the user can see their connections
    return false;
  }

  async getMutualConnections(userId: string, otherUserId: string): Promise<Connection[]> {
    const cacheKey = `mutual_connections:${userId}:${otherUserId}`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    
    // Get user's connections
    const userConnections = await this.connectionRepository.findFriends(userId);
    const userConnectionIds = userConnections.map(conn => 
      conn.requesterId === userId ? conn.addresseeId : conn.requesterId
    );
    
    // Get other user's connections
    const otherUserConnections = await this.connectionRepository.findFriends(otherUserId);
    const otherUserConnectionIds = otherUserConnections.map(conn => 
      conn.requesterId === otherUserId ? conn.addresseeId : conn.requesterId
    );
    
    // Find mutual connections
    const mutualIds = userConnectionIds.filter(id => otherUserConnectionIds.includes(id));
    
    // Get full connection objects for mutual connections
    const mutualConnections = userConnections.filter(conn => {
      const connectedUserId = conn.requesterId === userId ? conn.addresseeId : conn.requesterId;
      return mutualIds.includes(connectedUserId);
    });
    
    // Set the current user ID for proper DTO transformation
    mutualConnections.forEach(conn => {
      (conn as any).currentUserId = userId;
    });
    
    // Cache results
    await this.redis.set(
      cacheKey,
      JSON.stringify(mutualConnections),
      'EX',
      this.CACHE_TTL
    );
    
    return mutualConnections;
  }

  async getConnectionStats(userId: string): Promise<any> {
    const cacheKey = `connection_stats:${userId}`;
    const cachedData = await this.redis.get(cacheKey);
    
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    
    const stats = {
      totalFriends: await this.connectionRepository.countConnections(
        userId, 
        ConnectionType.FRIENDSHIP, 
        ConnectionStatus.ACCEPTED
      ),
      totalFollowers: await this.connectionRepository.countConnections(
        userId, 
        ConnectionType.FOLLOW, 
        ConnectionStatus.ACCEPTED,
        // Additional filter for followers (where user is the addressee)
      ),
      totalFollowing: await this.connectionRepository.countConnections(
        userId, 
        ConnectionType.FOLLOW, 
        ConnectionStatus.ACCEPTED,
        // Additional filter for following (where user is the requester)
      ),
      pendingRequests: await this.connectionRepository.countConnections(
        userId, 
        ConnectionType.FRIENDSHIP, 
        ConnectionStatus.PENDING
      )
    };
    
    // Cache results
    await this.redis.set(
      cacheKey,
      JSON.stringify(stats),
      'EX',
      this.CACHE_TTL
    );
    
    return stats;
  }

  // Helper method to invalidate connection-related cache for a user
  private async invalidateConnectionCache(userId: string): Promise<void> {
    const keys = [
      `connections:${userId}:*`,
      `connection_requests:${userId}`,
      `friends:${userId}`,
      `followers:${userId}`,
      `following:${userId}`,
      `blocked_users:${userId}`,
      `mutual_connections:${userId}:*`,
      `connection_stats:${userId}`
    ];
    
    for (const key of keys) {
      const matchingKeys = await this.redis.keys(key);
      if (matchingKeys.length > 0) {
        await this.redis.del(...matchingKeys);
      }
    }
  }
}