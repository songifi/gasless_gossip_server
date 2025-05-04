import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WebsocketJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractToken(client);
      
      if (!token) {
        throw new WsException('Unauthorized access');
      }

      const payload = this.jwtService.verify(token);
      
      // Attach user info to the socket object for future use
      client.data.user = payload;
      
      return true;
    } catch (error) {
      throw new WsException('Invalid token or authentication failed');
    }
  }

  private extractToken(client: Socket): string | null {
    // Check for token in handshake query
    const authToken = client.handshake?.query?.token as string;
    if (authToken) {
      return authToken;
    }
    
    // Check for token in handshake headers
    const authHeader = client.handshake?.headers?.authorization as string;
    if (authHeader && authHeader.split(' ')[0] === 'Bearer') {
      return authHeader.split(' ')[1];
    }
    
    return null;
  }
}