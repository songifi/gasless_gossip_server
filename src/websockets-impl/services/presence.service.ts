import { Injectable, Inject, Logger } from '@nestjs/common';
import { Redis } from 'redis';
import { PresenceStatus } from '../interfaces/websocket-message.interface';

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private readonly presenceKey = 'user:presence:';
  private readonly presenceExpirySeconds = 60; // Expire presence after 60 seconds of inactivity

  constructor(
    @Inject('REDIS_PUBLISHER') private readonly redis: Redis,
  ) {}

  async updateUserPresence(userId: string, status: 'online' | 'offline' | 'away' | 'busy'): Promise<void> {
    try {
      const presence: PresenceStatus = {
        userId,
        status,
        lastActive: new Date().toISOString(),
      };

      const key = `${this.presenceKey}${userId}`;
      
      // Store presence information in Redis with expiry
      await this.redis.set(key, JSON.stringify(presence));
      
      if (status === 'online') {
        // Set expiry for online status to auto-expire if not refreshed
        await this.redis.expire(key, this.presenceExpirySeconds);
      } else if (status === 'offline') {
        // For offline status, keep for longer to avoid flickering
        await this.redis.expire(key, 24 * 60 * 60); // 24 hours
      }

      this.logger.debug(`Updated presence for user ${userId}: ${status}`);
    } catch (error) {
      this.logger.error(`Error updating user presence: ${error.message}`);
    }
  }

  async getUserPresence(userId: string): Promise<PresenceStatus | null> {
    try {
      const presenceData = await this.redis.get(`${this.presenceKey}${userId}`);
      
      if (!presenceData) {
        return null;
      }
      
      return JSON.parse(presenceData);
    } catch (error) {
      this.logger.error(`Error getting user presence: ${error.message}`);
      return null;
    }
  }

  async isUserOnline(userId: string): Promise<boolean> {
    try {
      const presence = await this.getUserPresence(userId);
      return presence?.status === 'online';
    } catch (error) {
      this.logger.error(`Error checking if user is online: ${error.message}`);
      return false;
    }
  }

  async getUsersPresenceInRoom(roomId: string, userIds: string[]): Promise<PresenceStatus[]> {
    try {
      // Implementation would depend on how you manage room memberships
      // This is a simplified version
      const presencePromises = userIds.map(userId => this.getUserPresence(userId));
      const presenceResults = await Promise.all(presencePromises);
      
      // Filter out null values
      return presenceResults.filter(presence => presence !== null);
    } catch (error) {
      this.logger.error(`Error getting users presence in room: ${error.message}`);
      return [];
    }
  }

  // Heartbeat function to keep presence alive
  async heartbeat(userId: string): Promise<void> {
    await this.updateUserPresence(userId, 'online');
  }
}