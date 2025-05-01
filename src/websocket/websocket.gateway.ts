import {
    WebSocketGateway,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    WebSocketServer,
    SubscribeMessage,
    WsResponse,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { Logger, Injectable } from '@nestjs/common';
  import { WebsocketService } from './websocket.service';
  import { WsMessage } from './interfaces/ws-message.interface';
  
  @Injectable()
  @WebSocketGateway({
    cors: {
      origin: '*', // Configure according to your security needs
    },
  })
  export class WebsocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private readonly logger = new Logger(WebsocketGateway.name);
    private userSocketMap: Map<string, string[]> = new Map();
  
    constructor(private readonly websocketService: WebsocketService) {}
  
    afterInit() {
      this.logger.log('WebSocket Gateway Initialized');
      
      // Set the message handler to process Redis messages
      this.websocketService.setMessageHandler((message: WsMessage) => {
        this.handleRedisMessage(message);
      });
    }
  
    handleConnection(client: Socket) {
      const userId = client.handshake.query.userId as string;
      this.logger.log(`Client connected: ${client.id}, User ID: ${userId}`);
      
      if (userId) {
        // Store the socket ID for this user
        const userSockets = this.userSocketMap.get(userId) || [];
        userSockets.push(client.id);
        this.userSocketMap.set(userId, userSockets);
        
        // Join user's personal room
        client.join(`user:${userId}`);
      }
    }
  
    handleDisconnect(client: Socket) {
      const userId = client.handshake.query.userId as string;
      this.logger.log(`Client disconnected: ${client.id}`);
      
      if (userId) {
        // Remove the socket ID for this user
        const userSockets = this.userSocketMap.get(userId) || [];
        const updatedSockets = userSockets.filter(id => id !== client.id);
        
        if (updatedSockets.length > 0) {
          this.userSocketMap.set(userId, updatedSockets);
        } else {
          this.userSocketMap.delete(userId);
        }
      }
    }
  
    // Handle messages coming from Redis and distribute to connected clients
    private handleRedisMessage(message: WsMessage) {
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
    }
  
    // Publish a message to Redis, which will then be distributed to all server instances
    async broadcastMessage(message: WsMessage): Promise<void> {
      await this.websocketService.publish(message);
    }
  
    // Socket.io handlers for incoming WebSocket messages
    @SubscribeMessage('joinRoom')
    handleJoinRoom(client: Socket, room: string): WsResponse<string> {
      client.join(room);
      return { event: 'joinedRoom', data: room };
    }
    
    @SubscribeMessage('leaveRoom')
    handleLeaveRoom(client: Socket, room: string): WsResponse<string> {
      client.leave(room);
      return { event: 'leftRoom', data: room };
    }
    
    @SubscribeMessage('message')
    async handleMessage(client: Socket, payload: any): Promise<void> {
      const message: WsMessage = {
        event: 'message',
        data: payload.data,
        room: payload.room,
        userId: payload.userId,
      };
      
      // Publish to Redis to distribute to all server instances
      await this.broadcastMessage(message);
    }
  }
  