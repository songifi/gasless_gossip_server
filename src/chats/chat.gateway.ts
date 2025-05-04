import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { ChatService } from './chat.service';
  import { JoinRoomDto } from './dto/join-room.dto';
  import { MessageDto } from './dto/message.dto';
  import { Message } from './entities/message.entity';
  
  interface AuthenticatedSocket extends Socket {
    userId?: string;
    username?: string;
    rooms: Map<string, boolean>;
  }
  
  @WebSocketGateway({
    cors: {
      origin: '*',
    },
  })
  export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
    
    private connectedClients: Map<string, AuthenticatedSocket> = new Map();
  
    constructor(private readonly chatService: ChatService) {}
  
    async handleConnection(client: AuthenticatedSocket) {
      console.log(Client connected: ${client.id});
      client.rooms = new Map();
    }
  
    async handleDisconnect(client: AuthenticatedSocket) {
      console.log(Client disconnected: ${client.id});
      
      // Leave all rooms the user was in
      if (client.userId) {
        for (const roomId of client.rooms.keys()) {
          await this.handleLeaveRoom(client, roomId);
        }
        this.connectedClients.delete(client.userId);
      }
    }
  
    @SubscribeMessage('identify')
    async handleIdentify(
      @ConnectedSocket() client: AuthenticatedSocket,
      @MessageBody() payload: { userId: string; username: string },
    ) {
      client.userId = payload.userId;
      client.username = payload.username;
      this.connectedClients.set(payload.userId, client);
      
      return { status: 'identified' };
    }
  
    @SubscribeMessage('joinRoom')
    async handleJoinRoom(
      @ConnectedSocket() client: AuthenticatedSocket,
      @MessageBody() joinRoomDto: JoinRoomDto,
    ) {
      if (!client.userId) {
        client.userId = joinRoomDto.userId;
        client.username = joinRoomDto.username;
        this.connectedClients.set(joinRoomDto.userId, client);
      }
  
      const room = await this.chatService.getRoom(joinRoomDto.roomId);
      
      if (!room) {
        return { status: 'error', message: 'Room not found' };
      }
  
      // Join the Socket.IO room
      client.join(joinRoomDto.roomId);
      client.rooms.set(joinRoomDto.roomId, true);
      
      // Add user to room in Redis
      await this.chatService.addUserToRoom(
        joinRoomDto.roomId,
        joinRoomDto.userId,
        joinRoomDto.username,
      );
      
      // Get room messages for history
      const messages = await this.chatService.getRoomMessages(joinRoomDto.roomId);
      
      // Emit join event to room
      this.server.to(joinRoomDto.roomId).emit('userJoined', {
        userId: joinRoomDto.userId,
        username: joinRoomDto.username,
        roomId: joinRoomDto.roomId,
        timestamp: new Date(),
      });
      
      // Fetch current users in room
      const users = await this.chatService.getUsersInRoom(joinRoomDto.roomId);
      
      // Return room details and messages to the joining user
      return {
        status: 'joined',
        room,
        messages,
        users,
      };
    }
  
    @SubscribeMessage('leaveRoom')
    async handleLeaveRoom(
      @ConnectedSocket() client: AuthenticatedSocket,
      @MessageBody() roomId: string,
    ) {
      if (!client.userId || !client.rooms.has(roomId)) {
        return { status: 'error', message: 'Not in room' };
      }
      
      // Leave the Socket.IO room
      client.leave(roomId);
      client.rooms.delete(roomId);
      
      // Remove user from room in Redis
      await this.chatService.removeUserFromRoom(roomId, client.userId);
      
      // Emit leave event to room
      this.server.to(roomId).emit('userLeft', {
        userId: client.userId,
        username: client.username,
        roomId,
        timestamp: new Date(),
      });
      
      return { status: 'left' };
    }
  
    @SubscribeMessage('sendMessage')
    async handleMessage(
      @ConnectedSocket() client: AuthenticatedSocket,
      @MessageBody() messageDto: MessageDto,
    ) {
      if (!client.userId || !client.rooms.has(messageDto.roomId)) {
        return { status: 'error', message: 'Not in room' };
      }
      
      // Ensure message contains correct user information
      messageDto.userId = client.userId;
      messageDto.username = client.username;
      
      // Save message to database
      const savedMessage = await this.chatService.saveMessage(messageDto);
      
      // Broadcast message to room
      this.server.to(messageDto.roomId).emit('message', savedMessage);
      
      return { status: 'sent', message: savedMessage };
    }
  
    @SubscribeMessage('getRoomUsers')
    async handleGetRoomUsers(
      @ConnectedSocket() client: AuthenticatedSocket,
      @MessageBody() roomId: string,
    ) {
      if (!client.userId || !client.rooms.has(roomId)) {
        return { status: 'error', message: 'Not in room' };
      }
      
      const users = await this.chatService.getUsersInRoom(roomId);
      return { status: 'success', users };
    }
  
    // Helper method to notify when a user's presence changes
    async refreshRoomPresence(roomId: string) {
      const users = await this.chatService.getUsersInRoom(roomId);
      this.server.to(roomId).emit('roomUsers', { roomId, users });
    }
  }
  