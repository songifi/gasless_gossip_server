import { Injectable, Inject, Logger } from '@nestjs/common';
import { Redis } from 'redis';
import { WebsocketMessage, DeliveryReceipt } from '../interfaces/websocket-message.interface';
import { PresenceService } from './presence.service';
import { MessageQueueService } from './message-queue.service';
import { WebsocketEventLoggerService } from './websocket-logger.service';

@Injectable()
export class WebsocketsService {
  private readonly CHANNEL = 'websocket-messages';
  private readonly logger = new Logger(WebsocketsService.name);
  private messageHandler: (message: WebsocketMessage) => void;

  constructor(
    @Inject('REDIS_PUBLISHER') private readonly publisher: Redis,
    @Inject('REDIS_SUBSCRIBER') private readonly subscriber: Redis,
    private readonly presenceService: PresenceService,
    private readonly messageQueueService: MessageQueueService,
    private readonly loggerService: WebsocketEventLoggerService,
  ) {
    this.subscribeToChannel();
  }

  private async subscribeToChannel() {
    await this.subscriber.subscribe(this.CHANNEL, (message) => {
      try {
        if (this.messageHandler) {
          const parsedMessage = JSON.parse(message);
          this.messageHandler(parsedMessage);
          this.loggerService.logIncomingMessage(parsedMessage);
        }
      } catch (error) {
        this.logger.error(`Error processing Redis message: ${error.message}`);
      }
    });
    this.logger.log(`Subscribed to channel: ${this.CHANNEL}`);
  }

  setMessageHandler(handler: (message: WebsocketMessage) => void) {
    this.messageHandler = handler;
  }

  async publish(message: WebsocketMessage): Promise<void> {
    try {
      // Add timestamp if not present
      if (!message.timestamp) {
        message.timestamp = new Date().toISOString();
      }
      
      // Log outgoing message
      this.loggerService.logOutgoingMessage(message);

      // Store in queue for offline users if the message targets specific users
      if (message.userId && message.event === 'message') {
        const isOnline = await this.presenceService.isUserOnline(message.userId);
        if (!isOnline) {
          await this.messageQueueService.queueMessageForOfflineUser(message);
          return;
        }
      }

      // Publish message to Redis for all connected instances
      await this.publisher.publish(this.CHANNEL, JSON.stringify(message));
    } catch (error) {
      this.logger.error(`Error publishing message: ${error.message}`);
      throw error;
    }
  }

  async recordDeliveryReceipt(receipt: DeliveryReceipt): Promise<void> {
    try {
      // Could store in database for persistence
      this.logger.log(`Delivery receipt recorded: ${JSON.stringify(receipt)}`);
      
      // Notify sender about delivery status
      if (receipt.status === 'delivered' || receipt.status === 'read') {
        const deliveryNotification: WebsocketMessage = {
          event: `message.${receipt.status}`,
          data: {
            messageId: receipt.messageId,
            userId: receipt.userId,
            timestamp: receipt.timestamp,
          },
          // Direct to the original sender
          // This requires message metadata to know the sender
          // You'd typically get this from a database lookup
        };
        
        await this.publish(deliveryNotification);
      }
    } catch (error) {
      this.logger.error(`Error recording delivery receipt: ${error.message}`);
    }
  }

  async getUndeliveredMessages(userId: string): Promise<WebsocketMessage[]> {
    try {
      return await this.messageQueueService.getQueuedMessagesForUser(userId);
    } catch (error) {
      this.logger.error(`Error getting undelivered messages: ${error.message}`);
      return [];
    }
  }
}