import { Injectable } from '@nestjs/common';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class NotificationsService {
  constructor(private readonly websocketGateway: WebsocketGateway) {}

  async sendNotification(userId: string, notification: any) {
    // Send notification to a specific user
    await this.websocketGateway.broadcastMessage({
      event: 'notification',
      data: notification,
      userId,
    });
  }

  async broadcastAnnouncement(courseId: string, announcement: any) {
    // Send announcement to all users in a course room
    await this.websocketGateway.broadcastMessage({
      event: 'announcement',
      data: announcement,
      room: `course:${courseId}`,
    });
  }

  async broadcastSystemMessage(message: string) {
    // Broadcast to all connected users across all server instances
    await this.websocketGateway.broadcastMessage({
      event: 'system',
      data: { message },
    });
  }
}
