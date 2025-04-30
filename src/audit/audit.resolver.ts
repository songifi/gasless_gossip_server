import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogFilterInput } from './dto/audit-log-filter.input';
import { PaginationInput } from './dto/pagination.input';
import { AdminRoleGuard } from 'src/auth/guards/admin-role.guard';


@Resolver(() => AuditLog)
export class AuditResolver {
  constructor(private readonly auditService: AuditService) {}

  @Query(() => [AuditLog], { name: 'auditLogs' })
  @UseGuards(AdminRoleGuard)
  async getAuditLogs(
    @Args('filter', { nullable: true }) filter: AuditLogFilterInput = {},
    @Args('pagination', { nullable: true }) pagination: PaginationInput = { skip: 0, take: 10 },
  ): Promise<AuditLog[]> {
    const [auditLogs] = await this.auditService.findAuditLogs(filter, pagination);
    return auditLogs;
  }

  @Query(() => Int, { name: 'auditLogsCount' })
  @UseGuards(AdminRoleGuard)
  async getAuditLogsCount(
    @Args('filter', { nullable: true }) filter: AuditLogFilterInput = {},
  ): Promise<number> {
    const [, count] = await this.auditService.findAuditLogs(filter, { skip: 0, take: 0 });
    return count;
  }
}
