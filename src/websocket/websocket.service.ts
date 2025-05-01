import { Injectable, Inject } from '@nestjs/common';
import { WsMessage } from './interfaces/ws-message.interface';
import { Redis } from 'redis';

@Injectable()
export class WebsocketService {
  private readonly CHANNEL = 'ws-messages';

  constructor(
    @Inject('REDIS_PUBLISHER') private readonly publisher: Redis,
    @Inject('REDIS_SUBSCRIBER') private readonly subscriber: Redis,
  ) {
    this.subscribeToChannel();
  }

  private async subscribeToChannel() {
    await this.subscriber.subscribe(this.CHANNEL, (message) => {
      // This callback will be used by the gateway to handle messages
      // It will be set from the gateway using setMessageHandler
      if (this.messageHandler) {
        const parsedMessage = JSON.parse(message);
        this.messageHandler(parsedMessage);
      }
    });
  }

  private messageHandler: (message: WsMessage) => void;

  public setMessageHandler(handler: (message: WsMessage) => void) {
    this.messageHandler = handler;
  }

  public async publish(message: WsMessage): Promise<void> {
    await this.publisher.publish(this.CHANNEL, JSON.stringify(message));
  }
}
