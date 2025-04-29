// src/connection/services/connection-audit.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConnectionAuditLog } from '../entities/connection-audit-log.entity';
import { Connection } from '../entities/connection.entity';
import { Block } from '../entities/block.entity';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class ConnectionAuditService {
  private readonly logger = new Logger(ConnectionAuditService.name);
  
  constructor(
    @InjectRepository(ConnectionAuditLog)
    private readonly auditLogRepository: Repository<ConnectionAuditLog>,
  ) {}
  
  async logEvent(data: {
    userId: string;
    action: string;
    targetId?: string;
    targetType?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.auditLogRepository.save({
        userId: data.userId,
        action: data.action,
        targetId: data.targetId,
        targetType: data.targetType,
        details: data.details ? JSON.stringify(data.details) : null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error(`Failed to log audit event: ${error.message}`, error.stack);
    }
  }
  
  // Event listeners
  
  @OnEvent('connection.created')
  async handleConnectionCreated(connection: Connection, req?: any): Promise<void> {
    await this.logEvent({
      userId: connection.requesterId,
      action: 'CONNECTION_CREATED',
      targetId: connection.id,
      targetType: 'connection',
      details: {
        type: connection.type,
        addresseeId: connection.addresseeId
      },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }
  
  @OnEvent('connection.accepted')
  async handleConnectionAccepted(connection: Connection, req?: any): Promise<void> {
    await this.logEvent({
      userId: connection.addresseeId,
      action: 'CONNECTION_ACCEPTED',
      targetId: connection.id,
      targetType: 'connection',
      details: {
        requesterId: connection.requesterId
      },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }
  
  @OnEvent('user.blocked')
  async handleUserBlocked(block: Block, req?: any): Promise<void> {
    await this.logEvent({
      userId: block.userId,
      action: 'USER_BLOCKED',
      targetId: block.blockedId,
      targetType: 'user',
      details: {
        reason: block.reason
      },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }
}