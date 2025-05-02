
// src/space/space-context.service.ts
import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class SpaceContextService {
  private spaceId: string;

  constructor(@Inject(REQUEST) private readonly request: Request) {
    // Extract spaceId from request headers, params, or JWT token
    this.spaceId = request.headers['x-space-id'] as string || 
                   request.params.spaceId ||
                   (request.user as any)?.spaceId;
  }

  getSpaceId(): string {
    if (!this.spaceId) {
      throw new Error('Space context not available');
    }
    return this.spaceId;
  }

  setSpaceId(spaceId: string): void {
    this.spaceId = spaceId;
  }
}