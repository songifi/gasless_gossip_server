import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ModerationAction } from '../entities/moderation-action.entity';
import { Report } from '../entities/report.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(ModerationAction)
    private actionRepository: Repository<ModerationAction>,
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
  ) {}

  async getModeratorActions(
    moderatorId: string,
    startDate?: Date,
    endDate?: Date,
    page = 1,
    limit = 20,
  ): Promise<[ModerationAction[], number]> {
    const where: any = { moderatorId };
    
    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate);
    }
    
    return this.actionRepository.findAndCount({
      where,
      relations: ['report', 'report.reporter', 'report.reported'],
      skip: (page - 1) * limit,
      take: limit,
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getContentModerationHistory(
    contentType: string,
    contentId: string,
  ): Promise<{
    reports: Report[];
    actions: ModerationAction[];
  }> {
    const reports = await this.reportRepository.find({
      where: { contentType, contentId },
      relations: ['reporter', 'reported', 'actions', 'actions.moderator'],
      order: {
        createdAt: 'DESC',
      },
    });

    const actions = reports.reduce((acc, report) => {
      return [...acc, ...report.actions];
    }, [] as ModerationAction[]);

    return { reports, actions };
  }

  async getUserModerationHistory(userId: string): Promise<{
    reportedBy: Report[];
    reportedAgainst: Report[];
    moderationActions: ModerationAction[];
  }> {
    const [reportedBy, reportedAgainst] = await Promise.all([
      this.reportRepository.find({
        where: { reporterId: userId },
        relations: ['reported', 'actions', 'actions.moderator'],
        order: { createdAt: 'DESC' },
      }),
      this.reportRepository.find({
        where: { reportedId: userId },
        relations: ['reporter', 'actions', 'actions.moderator'],
        order: { createdAt: 'DESC' },
      }),
    ]);

    const moderationActions = await this.actionRepository.find({
      where: { moderatorId: userId },
      relations: ['report', 'report.reporter', 'report.reported'],
      order: { createdAt: 'DESC' },
    });

    return { reportedBy, reportedAgainst, moderationActions };
  }

  async generateModerationStats(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalReports: number;
    resolvedReports: number;
    dismissedReports: number;
    pendingReports: number;
    automatedReports: number;
    averageResolutionTime: number;
    topReportCategories: Array<{ category: string; count: number }>;
    moderatorActions: Array<{ moderatorId: string; actionCount: number }>;
  }> {
    // This would typically involve complex queries
    // Here's a simplified implementation with multiple queries
    
    const totalReports = await this.reportRepository.count({
      where: { createdAt: Between(startDate, endDate) },
    });
    
    const resolvedReports = await this.reportRepository.count({
      where: { 
        status: 'resolved',
        createdAt: Between(startDate, endDate),
      },
    });
    
    const dismissedReports = await this.reportRepository.count({
      where: { 
        status: 'dismissed',
        createdAt: Between(startDate, endDate),
      },
    });
    
    const pendingReports = await this.reportRepository.count({
      where: { 
        status: 'pending',
        createdAt: Between(startDate, endDate),
      },
    });
    
    const automatedReports = await this.reportRepository.count({
      where: { 
        isAutomated: true,
        createdAt: Between(startDate, endDate),
      },
    });
    
    // Get average resolution time
    const resolvedReportsData = await this.reportRepository.find({
      where: { 
        status: 'resolved',
        createdAt: Between(startDate, endDate),
      },
      relations: ['actions'],
    });
    
    let totalResolutionTime = 0;
    for (const report of resolvedReportsData) {
      if (report.actions && report.actions.length > 0) {
        const latestAction = report.actions.reduce((latest, action) => {
          return action.createdAt > latest.createdAt ? action : latest;
        }, report.actions[0]);
        
        totalResolutionTime += latestAction.createdAt.getTime() - report.createdAt.getTime();
      }
    }
    
    const averageResolutionTime = resolvedReportsData.length > 0 
      ? totalResolutionTime / resolvedReportsData.length / (1000 * 60 * 60) // in hours
      : 0;
    
    // Get report categories breakdown
    const categories = await this.reportRepository
      .createQueryBuilder('report')
      .select('report.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('report.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('report.category')
      .orderBy('count', 'DESC')
      .getRawMany();
    
    // Get moderator actions breakdown
    const moderatorActions = await this.actionRepository
      .createQueryBuilder('action')
      .select('action.moderatorId', 'moderatorId')
      .addSelect('COUNT(*)', 'actionCount')
      .where('action.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('action.moderatorId')
      .orderBy('actionCount', 'DESC')
      .getRawMany();
    
    return {
      totalReports,
      resolvedReports,
      dismissedReports,
      pendingReports,
      automatedReports,
      averageResolutionTime,
      topReportCategories: categories.map(c => ({ 
        category: c.category, 
        count: parseInt(c.count, 10)
      })),
      moderatorActions: moderatorActions.map(m => ({ 
        moderatorId: m.moderatorId, 
        actionCount: parseInt(m.actionCount, 10)
      })),
    };
  }
}