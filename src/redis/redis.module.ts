import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Redis from 'redis';
import redisConfig from '../config/redis.config';

@Global()
@Module({})
export class RedisModule {
  static forRootAsync(): DynamicModule {
    return {
      module: RedisModule,
      imports: [
        ConfigModule.forFeature(redisConfig),
      ],
      providers: [
        {
          provide: 'REDIS_PUBLISHER',
          useFactory: (configService: ConfigService) => {
            const redisOptions = configService.get('redis');
            const client = Redis.createClient(redisOptions);
            client.connect();
            return client;
          },
          inject: [ConfigService],
        },
        {
          provide: 'REDIS_SUBSCRIBER',
          useFactory: (configService: ConfigService) => {
            const redisOptions = configService.get('redis');
            const client = Redis.createClient(redisOptions);
            client.connect();
            return client;
          },
          inject: [ConfigService],
        },
      ],
      exports: ['REDIS_PUBLISHER', 'REDIS_SUBSCRIBER'],
    };
  }
}
