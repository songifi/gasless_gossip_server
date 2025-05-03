
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AbuseReportsService } from './abuse-reports.service';
import { CreateAbuseReportDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Audited } from '../audit/decorators/audit-action.decorator';
import { AuditActionType } from '../audit/entities/audit-log.entity';
import { CurrentUser } from '../audit/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('reports/abuse')
@UseGuards(JwtAuthGuard)
export class AbuseReportsController {
  constructor(private readonly abuseReportsService: AbuseReportsService) {}

  @Post()
  @Audited({
    action: AuditActionType.ABUSE_REPORT,
    entityType: 'abuse_reports',
  })
  async create(@Body() createAbuseReportDto: CreateAbuseReportDto, @CurrentUser() user: User) {
    return this.abuseReportsService.create(createAbuseReportDto, user.id);
  }
}
