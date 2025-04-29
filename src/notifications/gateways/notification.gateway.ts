import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({ namespace: 'notifications', cors: { origin: '*' } })
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.query.token as string;
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET') || 'your-secret-key',
      });
      client.join(payload.id); // Join user-specific room
      client.emit('connected', { status: 'connected' });
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    client.disconnect();
  }

  @OnEvent('notification.delivered')
  handleNotificationDelivered(payload: { userId: string; notification: any }) {
    this.server.to(payload.userId).emit('newNotification', payload.notification);
  }
}