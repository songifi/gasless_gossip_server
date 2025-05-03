import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditActionType } from './entities/audit-log.entity';
import { Request } from 'express';

export interface AuditLogDto {
  action: AuditActionType;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  userId?: string;
  request?: Request;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async createLog(logDto: AuditLogDto): Promise<AuditLog> {
    const auditLog = new AuditLog();
    Object.assign(auditLog, logDto);

    if (logDto.request) {
      auditLog.ipAddress = this.getIpAddress(logDto.request);
      auditLog.userAgent = logDto.request.headers['user-agent'] as string;
    }

    return this.auditLogRepository.save(auditLog);
  }

  async findAll(
    page = 1,
    limit = 10,
    filters?: Partial<AuditLog>,
  ): Promise<[AuditLog[], number]> {
    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit_log');

    if (filters?.action) queryBuilder.andWhere('audit_log.action = :action', { action: filters.action });
    if (filters?.entityType) queryBuilder.andWhere('audit_log.entityType = :entityType', { entityType: filters.entityType });
    if (filters?.entityId) queryBuilder.andWhere('audit_log.entityId = :entityId', { entityId: filters.entityId });
    if (filters?.userId) queryBuilder.andWhere('audit_log.userId = :userId', { userId: filters.userId });

    queryBuilder.orderBy('audit_log.createdAt', 'DESC');
    queryBuilder.skip((page - 1) * limit).take(limit);

    return queryBuilder.getManyAndCount();
  }

  private getIpAddress(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string) ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }
}
