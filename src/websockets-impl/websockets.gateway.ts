import {
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  SubscribeMessage,
  WsResponse,
  WsException,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Inject, ValidationPipe, UsePipes } from '@nestjs/common';
import { WebsocketsService } from './services/websockets.service';
import { PresenceService } from './services/presence.service';
import { WebsocketEventLoggerService } from './services/websocket-logger.service';
import { MessageQueueService } from './services/message-queue.service';
import { WebsocketJwtGuard } from './guards/websocket-jwt.guard';
import { WebsocketThrottlerGuard } from './guards/websocket-throttler.guard';
import { WebsocketMessage, TypingIndicator, DeliveryReceipt } from './interfaces/websocket-message.interface';
import { RoomMessageDto } from './dto/room-message.dto';
import { TypingIndicatorDto } from './dto/typing-indicator.dto';
import { PresenceUpdateDto } from './dto/presence-update.dto';
import { ReadReceiptDto } from './dto/read-receipt.dto';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { performance } from 'perf_hooks';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
  transports: ['websocket', 'polling'],
})
export class WebsocketsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(WebsocketsGateway.name);
  private userSocketMap: Map<string, Set<string>> = new Map();
  private socketAuthMap: Map<string, string> = new Map(); // Map socket ID to user ID
  
  private heartbeatInterval = 30000; // 30 seconds
  private heartbeatTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly websocketsService: WebsocketsService,
    private readonly presenceService: PresenceService,
    private readonly loggerService: WebsocketEventLoggerService,
    private readonly messageQueueService: MessageQueueService,
    private readonly configService: ConfigService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway Initialized');
    
    // Set the message handler to process Redis messages
    this.websocketsService.setMessageHandler((message: WebsocketMessage) => {
      this.handleRedisMessage(message);
    });

    // Set heartbeat interval from config or use default
    this.heartbeatInterval = this.configService.get<number>('WEBSOCKET_HEARTBEAT_INTERVAL') || 30000;
  }

  @UseGuards(WebsocketJwtGuard)
  async handleConnection(client: Socket) {
    try {
      const startTime = performance.now();
      const userId = client.data?.user?.sub;
      
      if (!userId) {
        client.disconnect();
        return;
      }

      // Store socket ID for this user
      let userSockets = this.userSocketMap.get(userId);
      if (!userSockets) {
        userSockets = new Set();
        this.userSocketMap.set(userId, userSockets);
      }
      userSockets.add(client.id);
      this.socketAuthMap.set(client.id, userId);
      
      // Join user's personal room
      client.join(`user:${userId}`);
      
      // Update presence
      await this.presenceService.updateUserPresence(userId, 'online');
      
      // Set up heartbeat timeout
      this.setupHeartbeatTimeout(client.id, userId);
      
      // Check for any undelivered messages
      const undeliveredMessages = await this.websocketsService.getUndeliveredMessages(userId);
      if (undeliveredMessages.length > 0) {
        this.logger.log(`Delivering ${undeliveredMessages.length} offline messages to user ${userId}`);
        undeliveredMessages.forEach(message => {
          client.emit(message.event, message.data);
        });
      }
      
      const connectionTime = performance.now() - startTime;
      this.loggerService.logConnectionEvent(client.id, userId, 'connected', {
        connectionTime,
        device: client.handshake.headers['user-agent'],
      });
      this.loggerService.logPerformanceMetric('connection-handling', connectionTime, { userId });
      
      // Notify room members about user connection
      this.broadcastPresenceUpdate(userId, 'online');
    } catch (error) {
      this.logger.error(`Error in handleConnection: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const userId = this.socketAuthMap.get(client.id);
      this.logger.log(`Client disconnected: ${client.id}, User ID: ${userId || 'unknown'}`);
      
      // Clean up socket maps
      if (userId) {
        const userSockets = this.userSocketMap.get(userId);
        if (userSockets) {
          userSockets.delete(client.id);
          if (userSockets.size === 0) {
            // Last connection for this user
            this.userSocketMap.delete(userId);
            
            // Update presence to offline
            await this.presenceService.updateUserPresence(userId, 'offline');
            
            // Notify room members about user disconnection
            this.broadcastPresenceUpdate(userId, 'offline');
          }
        }
      }
      
      this.socketAuthMap.delete(client.id);
      
      // Clear heartbeat timeout
      this.clearHeartbeatTimeout(client.id);
      
      // Log the disconnection
      this.loggerService.logConnectionEvent(client.id, userId || 'unknown', 'disconnected');
    } catch (error) {
      this.logger.error(`Error in handleDisconnect: ${error.message}`);
    }
  }

  // Handle messages coming from Redis and distribute to connected clients
  private handleRedisMessage(message: WebsocketMessage) {
    try {
      const startTime = performance.now();
      
      if (message.room) {
        // Broadcast to a specific room
        this.server.to(message.room).emit(message.event, message.data);
      } else if (message.userId) {
        // Send to a specific user
        this.server.to(`user:${message.userId}`).emit(message.event, message.data);
      } else {
        // Broadcast to all connected clients
        this.server.emit(message.event, message.data);
      }
      
      const deliveryTime = performance.now() - startTime;
      this.loggerService.logPerformanceMetric('message-delivery', deliveryTime, {
        event: message.event,
        hasRoom: !!message.room,
        hasUser: !!message.userId,
      });
    } catch (error) {
      this.logger.error(`Error handling Redis message: ${error.message}`);
    }
  }

  // Publish a message to Redis, which will then be distributed to all server instances
  async broadcastMessage(message: WebsocketMessage): Promise<void> {
    try {
      await this.websocketsService.publish(message);
    } catch (error) {
      this.logger.error(`Error broadcasting message: ${error.message}`);
      throw new WsException('Failed to broadcast message');
    }
  }

  // Socket.io handlers for incoming WebSocket messages
  @UseGuards(WebsocketJwtGuard, WebsocketThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 messages per minute
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomMessageDto,
  ): Promise<WsResponse<any>> {
    try {
      const userId = this.getUserIdFromSocket(client);
      
      // Create a unique ID for this message
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create WebSocket message 
      const message: WebsocketMessage = {
        event: 'newMessage',
        data: {
          id: messageId,
          sender: userId,
          content: payload.content,
          timestamp: new Date().toISOString(),
          ...payload,
        },
        room: payload.roomId,
        messageId,
        timestamp: new Date().toISOString(),
      };
      
      // Publish to Redis to distribute to all server instances
      await this.broadcastMessage(message);
      
      // Return acknowledgement with message ID to sender
      return { 
        event: 'messageSent', 
        data: { 
          id: messageId, 
          timestamp: message.timestamp,
          status: 'sent'
        }
      };
    } catch (error) {
      this.logger.error(`Error handling message: ${error.message}`);
      throw new WsException('Failed to send message');
    }
  }
  
  @UseGuards(WebsocketJwtGuard)
  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() roomId: string,
  ): WsResponse<string> {
    try {
      const userId = this.getUserIdFromSocket(client);
      client.join(roomId);
      
      this.logger.log(`User ${userId} joined room ${roomId}`);
      
      // Let others in the room know someone joined
      this.broadcastMessage({
        event: 'userJoinedRoom',
        data: { userId, timestamp: new Date().toISOString() },
        room: roomId,
      });
      
      return { event: 'joinedRoom', data: roomId };
    } catch (error) {
      this.logger.error(`Error joining room: ${error.message}`);
      throw new WsException('Failed to join room');
    }
  }
  
  @UseGuards(WebsocketJwtGuard)
  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() roomId: string,
  ): WsResponse<string> {
    try {
      const userId = this.getUserIdFromSocket(client);
      client.leave(roomId);
      
      this.logger.log(`User ${userId} left room ${roomId}`);
      
      // Let others in the room know someone left
      this.broadcastMessage({
        event: 'userLeftRoom',
        data: { userId, timestamp: new Date().toISOString() },
        room: roomId,
      });
      
      return { event: 'leftRoom', data: roomId };
    } catch (error) {
      this.logger.error(`Error leaving room: ${error.message}`);
      throw new WsException('Failed to leave room');
    }
  }

  @UseGuards(WebsocketJwtGuard, WebsocketThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 updates per minute (1 every 2 seconds)
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('typingIndicator')
  async handleTypingIndicator(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TypingIndicatorDto,
  ): Promise<void> {
    try {
      const userId = this.getUserIdFromSocket(client);
      
      const typing: TypingIndicator = {
        userId,
        roomId: payload.roomId,
        isTyping: payload.isTyping,
        timestamp: new Date().toISOString(),
      };
      
      // Broadcast typing indicator to room
      await this.broadcastMessage({
        event: 'userTyping',
        data: typing,
        room: payload.roomId,
      });
    } catch (error) {
      this.logger.error(`Error handling typing indicator: ${error.message}`);
      throw new WsException('Failed to send typing indicator');
    }
  }

  @UseGuards(WebsocketJwtGuard)
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('presenceUpdate')
  async handlePresenceUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PresenceUpdateDto,
  ): Promise<void> {
    try {
      const userId = this.getUserIdFromSocket(client);
      
      // Update presence in database/cache
      await this.presenceService.updateUserPresence(userId, payload.status);
      
      // Broadcast presence update to relevant users
      this.broadcastPresenceUpdate(userId, payload.status);
    } catch (error) {
      this.logger.error(`Error handling presence update: ${error.message}`);
      throw new WsException('Failed to update presence');
    }
  }

  @UseGuards(WebsocketJwtGuard)
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('readReceipt')
  async handleReadReceipt(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ReadReceiptDto,
  ): Promise<void> {
    try {
      const userId = this.getUserIdFromSocket(client);
      
      const receipt: DeliveryReceipt = {
        messageId: payload.messageId,
        userId,
        status: 'read',
        timestamp: new Date().toISOString(),
      };
      
      // Record the read receipt
      await this.websocketsService.recordDeliveryReceipt(receipt);
      
      // Broadcast read receipt to room (optional, depending on requirements)
      await this.broadcastMessage({
        event: 'messageRead',
        data: {
          messageId: payload.messageId,
          userId,
          timestamp: receipt.timestamp,
        },
        room: payload.roomId,
      });
    } catch (error) {
      this.logger.error(`Error handling read receipt: ${error.message}`);
      throw new WsException('Failed to process read receipt');
    }
  }

  @UseGuards(WebsocketJwtGuard)
  @SubscribeMessage('heartbeat')
  async handleHeartbeat(@ConnectedSocket() client: Socket): Promise<void> {
    try {
      const userId = this.getUserIdFromSocket(client);
      
      // Reset heartbeat timeout
      this.setupHeartbeatTimeout(client.id, userId);
      
      // Update user's presence timestamp
      await this.presenceService.heartbeat(userId);
    } catch (error) {
      this.logger.error(`Error handling heartbeat: ${error.message}`);
    }
  }

  @UseGuards(WebsocketJwtGuard)
  @SubscribeMessage('syncMessages')
  async handleSyncMessages(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string, lastMessageId?: string, limit?: number },
  ): Promise<WsResponse<any>> {
    try {
      // This would typically query the database for missed messages
      // Simplified implementation here
      const userId = this.getUserIdFromSocket(client);
      
      this.logger.log(`User ${userId} requested message sync for room ${payload.roomId}`);
      
      // Return an acknowledgement
      return { 
        event: 'syncComplete', 
        data: { 
          roomId: payload.roomId,
          syncedMessageCount: 0, // Replace with actual count
        }
      };
    } catch (error) {
      this.logger.error(`Error syncing messages: ${error.message}`);
      throw new WsException('Failed to sync messages');
    }
  }

  // Private helper methods
  private getUserIdFromSocket(client: Socket): string {
    const userId = this.socketAuthMap.get(client.id) || client.data?.user?.sub;
    if (!userId) {
      throw new WsException('User not authenticated');
    }
    return userId;
  }

  private setupHeartbeatTimeout(socketId: string, userId: string): void {
    // Clear existing timeout
    this.clearHeartbeatTimeout(socketId);
    
    // Set new timeout
    const timeout = setTimeout(() => {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        this.logger.log(`Heartbeat timeout for user ${userId}, disconnecting`);
        socket.disconnect(true);
      }
    }, this.heartbeatInterval * 2); // Double heartbeat interval for timeout
    
    this.heartbeatTimeouts.set(socketId, timeout);
  }

  private clearHeartbeatTimeout(socketId: string): void {
    const timeout = this.heartbeatTimeouts.get(socketId);
    if (timeout) {
      clearTimeout(timeout);
      this.heartbeatTimeouts.delete(socketId);
    }
  }

  private async broadcastPresenceUpdate(userId: string, status: 'online' | 'offline' | 'away' | 'busy'): Promise<void> {
    try {
      // This would typically lookup the user's contacts/friends or room memberships
      // and notify only relevant users about the presence change
      
      // Simplified implementation - broadcast to system for demo
      await this.broadcastMessage({
        event: 'presenceUpdate',
        data: {
          userId,
          status,
          lastActive: new Date().toISOString(),
        },
      });
    } catch (error) {
      this.logger.error(`Error broadcasting presence update: ${error.message}`);
    }
  }
}