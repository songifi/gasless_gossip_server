// events.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { CryptoService } from './crypto.service';
  
  @WebSocketGateway({
    cors: {
      origin: '*',
    },
  })
  export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
    
    private userSocketMap: Map<string, string> = new Map();
    
    constructor(private cryptoService: CryptoService) {}
    
    handleConnection(client: Socket) {
      console.log(Client connected: ${client.id});
    }
    
    handleDisconnect(client: Socket) {
      // Remove user from the map when disconnected
      for (const [userId, socketId] of this.userSocketMap.entries()) {
        if (socketId === client.id) {
          this.userSocketMap.delete(userId);
          break;
        }
      }
      console.log(Client disconnected: ${client.id});
    }
    
    @SubscribeMessage('register')
    handleRegister(client: Socket, payload: { userId: string }) {
      this.userSocketMap.set(payload.userId, client.id);
      console.log(User ${payload.userId} registered with socket ${client.id});
    }
    
    emitMessage(recipientId: string, message: any) {
      const socketId = this.userSocketMap.get(recipientId);
      if (socketId) {
        this.server.to(socketId).emit('message', message);
      }
    }
  }