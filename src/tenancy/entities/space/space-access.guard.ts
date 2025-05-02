
// src/space/space-access.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SpaceService } from './space.service';

@Injectable()
export class SpaceAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private spaceService: SpaceService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const spaceId = request.headers['x-space-id'] as string || request.params.spaceId;
    
    if (!spaceId) {
      throw new ForbiddenException('Space ID is required');
    }
    
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }
    
    // Check if user has access to this space
    const hasAccess = await this.spaceService.checkUserAccess(user.id, spaceId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this space');
    }
    
    // Set the space context for this request
    request.spaceId = spaceId;
    
    return true;
  }
}
