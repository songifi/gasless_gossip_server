import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WebsocketThrottlerGuard extends ThrottlerGuard {
  async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
  ): Promise<boolean> {
    try {
      return await super.handleRequest(context, limit, ttl);
    } catch (error) {
      throw new WsException('Too many requests');
    }
  }

  protected getTracker(context: ExecutionContext): string {
    const client = context.switchToWs().getClient();
    const userId = client.data?.user?.sub || 'anonymous';
    
    // Create a unique key based on user ID and event name
    const event = context.switchToWs().getPattern();
    return `${userId}-${event}`;
  }
}