import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions, Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'redis';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cookie from 'cookie';
import { JwtService } from '@nestjs/jwt';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter>;
  private jwtService: JwtService;

  constructor(
    private readonly app: INestApplicationContext,
  ) {
    super(app);
    this.jwtService = this.app.get(JwtService);
  }

  async connectToRedis(): Promise<void> {
    const configService = this.app.get(ConfigService);
    
    const pubClient = this.app.get<Redis>('REDIS_PUBLISHER');
    const subClient = this.app.get<Redis>('REDIS_SUBSCRIBER');
    
    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log('Redis adapter successfully connected');
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: true,
        credentials: true,
      },
      // Connection handling for large scale
      connectionStateRecovery: {
        // Restore lost messages upon reconnection
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true,
      },
      // Add other socket.io options
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Use Redis adapter for horizontal scaling
    server.adapter(this.adapterConstructor);

    // Add global middleware for authentication if needed
    server.use((socket, next) => {
      try {
        // Check for authentication
        const token = this.extractToken(socket);
        
        if (!token) {
          return next(new Error('Authentication error'));
        }

        // Verify JWT token
        const payload = this.jwtService.verify(token);
        socket.data.user = payload;
        
        return next();
      } catch (error) {
        return next(new Error('Authentication error'));
      }
    });

    return server;
  }

  private extractToken(socket: any): string | null {
    // Check for token in handshake query
    const authToken = socket.handshake?.query?.token as string;
    if (authToken) {
      return authToken;
    }
    
    // Check for token in handshake headers
    const authHeader = socket.handshake?.headers?.authorization as string;
    if (authHeader && authHeader.split(' ')[0] === 'Bearer') {
      return authHeader.split(' ')[1];
    }
    
    // Check for token in cookies
    const cookies = cookie.parse(socket.handshake.headers.cookie || '');
    if (cookies.token) {
      return cookies.token;
    }
    
    return null;
  }
}