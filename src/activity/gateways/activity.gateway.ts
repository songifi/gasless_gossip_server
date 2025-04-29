// src/activity/gateways/activity.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { UseGuards } from '@nestjs/common';
  import { WsJwtGuard } from '../../guards/ws-jwt.guard';
  import { FeedService } from '../services/feed.service';
  import { FeedOptions } from '../interfaces/feed-options.interface';
  
  @WebSocketGateway({
    cors: {
      origin: '*',
    },
    namespace: 'activity',
  })
  export class ActivityGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
  
    private userSockets: Map<number, Set<string>> = new Map();
  
    constructor(private readonly feedService: FeedService) {}
  
    async handleConnection(client: Socket): Promise<void> {
      // Authentication happens in the WsJwtGuard
      try {
        const user = client.handshake.auth.user;
        if (user && user.id) {
          const userId = user.id;
          
          if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
          }
          
          this.userSockets.get(userId).add(client.id);
          
          // Join user-specific room
          client.join(`user:${userId}`);
          
          console.log(`Client connected: ${client.id} for user ${userId}`);
        }
      } catch (error) {
        console.error('Socket connection error:', error);
        client.disconnect();
      }
    }
  
    handleDisconnect(client: Socket): void {
      // Clean up userSockets map
      for (const [userId, sockets] of this.userSockets.entries()) {
        if (sockets.has(client.id)) {
          sockets.delete(client.id);
          
          if (sockets.size === 0) {
            this.userSockets.delete(userId);
          }
          
          console.log(`Client disconnected: ${client.id} for user ${userId}`);
          break;
        }
      }
    }
  
    @UseGuards(WsJwtGuard)
    @SubscribeMessage('subscribe-feed')
    async handleSubscribeFeed(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: { userId: number },
    ): Promise<void> {
      const userId = data.userId;
      
      // Additional validation to ensure the client only subscribes to their own feed
      if (client.handshake.auth.user.id !== userId) {
        client.emit('error', { message: 'Unauthorized subscription attempt' });
        return;
      }
      
      // Subscribe to user's feed updates
      client.join(`feed:${userId}`);
      client.emit('subscription-success', { channel: `feed:${userId}` });
    }
  
    @UseGuards(WsJwtGuard)
    @SubscribeMessage('get-feed')
    async handleGetFeed(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: { userId: number; options?: FeedOptions },
    ): Promise<void> {
      try {
        const { userId, options } = data;
        
        // Authorization check
        if (client.handshake.auth.user.id !== userId) {
          client.emit('error', { message: 'Unauthorized feed request' });
          return;
        }
        
        const feed = await this.feedService.generateFeed(userId, options);
        client.emit('feed-data', feed);
      } catch (error) {
        client.emit('error', { message: error.message });
      }
    }
  
    @UseGuards(WsJwtGuard)
    @SubscribeMessage('mark-read')
    async handleMarkRead(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: { userId: number; feedItemId: number },
    ): Promise<void> {
      try {
        const { userId, feedItemId } = data;
        
        // Authorization check
        if (client.handshake.auth.user.id !== userId) {
          client.emit('error', { message: 'Unauthorized mark-read request' });
          return;
        }
        
        await this.feedService.markFeedItemAsRead(userId, feedItemId);
        client.emit('mark-read-success', { feedItemId });
      } catch (error) {
        client.emit('error', { message: error.message });
      }
    }
  
    // Method to broadcast feed updates to relevant users
    notifyFeedUpdate(userId: number, activityData: any): void {
      this.server.to(`feed:${userId}`).emit('feed-update', {
        type: 'new-activity',
        data: activityData,
      });
    }
  }