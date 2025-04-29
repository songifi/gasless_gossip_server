// src/connection/guards/connection-owner.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConnectionService } from '../connection.service';

@Injectable()
export class ConnectionOwnerGuard implements CanActivate {
  constructor(private readonly connectionService: ConnectionService) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user.id;
    const connectionId = request.params.id;
    
    if (!connectionId) {
      return true; // No connectionId to check
    }
    
    try {
      const connection = await this.connectionService.getConnectionById(userId, connectionId);
      
      // Check if user is part of this connection
      const isOwner = connection.requesterId === userId || connection.addresseeId === userId;
      
      if (!isOwner) {
        throw new ForbiddenException('You do not have permission to access this connection');
      }
      
      // Attach connection to request for later use
      request.connection = connection;
      
      return true;
    } catch (error) {
      // Pass through NotFoundExceptions from the service
      throw error;
    }
  }
}