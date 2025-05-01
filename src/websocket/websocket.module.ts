import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { WebsocketService } from './websocket.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule.forRootAsync()],
  providers: [WebsocketGateway, WebsocketService],
  exports: [WebsocketGateway, WebsocketService],
})
export class WebsocketModule {}
