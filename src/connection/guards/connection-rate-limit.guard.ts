// src/connection/guards/connection-rate-limit.guard.ts
import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRedis } from '@nestjs/redis';
import Redis from 'ioredis';
import { Request } from 'express';

@Injectable()
export class ConnectionRateLimitGuard implements CanActivate {
  constructor(@InjectRedis() private readonly redis: Redis) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.user.id;
    
    // Define limits for different operations
    const limits = {
      'POST /connections': { max: 50, window: 3600 }, // 50 requests per hour
      'DELETE /connections': { max: 100, window: 3600 }, // 100 requests per hour
      'POST /connections/block': { max: 20, window: 3600 } // 20 blocks per hour
    };
    
    const endpoint = `${request.method} ${request.route.path}`;
    const limit = limits[endpoint] || { max: 1000, window: 3600 }; // Default limit
    
    // Check rate limit
    const key = `ratelimit:${endpoint}:${userId}`;
    const current = await this.redis.incr(key);
    
    // Set expiry on first request
    if (current === 1) {
      await this.redis.expire(key, limit.window);
    }
    
    // If over limit, reject request
    if (current > limit.max) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: await this.redis.ttl(key)
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
    
    return true;
  }
}