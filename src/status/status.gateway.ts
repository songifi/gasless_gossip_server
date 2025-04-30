import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { StatusService } from './status.service';
  
  @WebSocketGateway({
    cors: {
      origin: '*',
    },
  })
  export class StatusGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
  
    private connectedUsers = new Map<string, Socket>();
  
    constructor(private readonly statusService: StatusService) {}
  
    async handleConnection(client: Socket): Promise<void> {
      try {
        // Authentication logic
        const userId = client.handshake.query.userId as string;
        if (!userId) {
          client.disconnect();
          return;
        }
  
        // Store user connection
        this.connectedUsers.set(userId, client);
        
        // Join user-specific room
        client.join(`user-${userId}`);
        
        // Sync missed status updates
        await this.statusService.syncStatusUpdatesForUser(userId);
        
        console.log(`Client connected: ${userId}`);
      } catch (error) {
        console.error('WebSocket connection error:', error);
        client.disconnect();
      }
    }
  
    handleDisconnect(client: Socket): void {
      try {
        const userId = client.handshake.query.userId as string;
        if (userId) {
          this.connectedUsers.delete(userId);
          console.log(`Client disconnected: ${userId}`);
        }
      } catch (error) {
        console.error('WebSocket disconnect error:', error);
      }
    }
  
    @SubscribeMessage('status:read')
    async handleReadStatus(client: Socket, payload: { messageId: string }): Promise<void> {
      try {
        const userId = client.handshake.query.userId as string;
        if (!userId) return;
  
        await this.statusService.updateMessageStatus(
          payload.messageId,
          userId,
          'read',
        );
      } catch (error) {
        console.error('Error processing read status:', error);
      }
    }
  
    // Send status update to specific user
    sendStatusUpdate(userId: string, data: any): void {
      this.server.to(`user-${userId}`).emit('status:update', data);
    }
  
    // Check if user is connected
    isUserConnected(userId: string): boolean {
      return this.connectedUsers.has(userId);
    }
  }
  