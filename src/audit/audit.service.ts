import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindManyOptions } from 'typeorm';
import { AuditLog, ActionType } from './entities/audit-log.entity';
import { AuditLogFilterInput } from './dto/audit-log-filter.input';
import { PaginationInput } from './dto/pagination.input';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async createAuditLog(
    userId: string,
    actionType: ActionType,
    description: string,
    metadata?: Record<string, any>,
  ): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      userId,
      actionType,
      description,
      metadata,
    });

    return this.auditLogRepository.save(auditLog);
  }

  async findAuditLogs(
    filter: AuditLogFilterInput,
    pagination: PaginationInput,
  ): Promise<[AuditLog[], number]> {
    const { userId, actionType, startDate, endDate } = filter;
    const { skip, take } = pagination;

    const queryOptions: FindManyOptions<AuditLog> = {
      where: {},
      skip,
      take,
      order: {
        createdAt: 'DESC',
      },
    };
     if(!queryOptions.where)throw new Error('');
    if (userId ) {
      queryOptions.where['userId'] = userId;
    }

    if (actionType) {
      queryOptions.where['actionType'] = actionType;
    }

    if (startDate || endDate) {
      queryOptions.where['createdAt'] = Between(
        startDate || new Date(0),
        endDate || new Date(),
      );
    }

    return this.auditLogRepository.findAndCount(queryOptions);
  }
}
