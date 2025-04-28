import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RefreshTokenService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async generateRefreshToken(userId: string): Promise<string> {
    const refreshToken = uuidv4();
    const ttl = this.configService.get<number>('REFRESH_TOKEN_TTL', 604800); // 1 week

    await this.cacheManager.set(
      `refresh_token:${refreshToken}`,
      userId,
      ttl
    );

    return refreshToken;
  }

  async validateRefreshToken(token: string): Promise<string | null> {
    return this.cacheManager.get(`refresh_token:${token}`);
  }

  private async getKeys(pattern: string): Promise<string[]> {
    // Try v5.x approach first
    try {
      return await (this.cacheManager as any).store.keys(pattern);
    } catch (error) {
      // Fallback to v4.x approach
      return await (this.cacheManager as any).stores[0].keys(pattern);
    }
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    // Get all keys matching the user's refresh tokens
    const keys = await this.getKeys('refresh_token:*');
    
    // Find and revoke all tokens belonging to the user
    for (const key of keys) {
      const tokenUserId = await this.cacheManager.get(key);
      if (tokenUserId === userId) {
        await this.cacheManager.del(key);
      }
    }

    // Add user to blacklist with short TTL to prevent immediate reuse
    const blacklistTTL = 60 * 5; // 5 minutes
    await this.cacheManager.set(
      `token_blacklist:${userId}`,
      new Date().getTime(),
      blacklistTTL
    );
  }
}
