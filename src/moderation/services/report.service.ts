import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from '../entities/report.entity';
import { CreateReportDto } from '../dto/create-report.dto';
import { ReportStatus } from '../interfaces/report-status.enum';
import { ModerationPriority } from '../interfaces/moderation-priority.enum';
import { NotificationService } from '../../notification/services/notification.service';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
    private notificationService: NotificationService,
  ) {}

  async create(createReportDto: CreateReportDto, reporterId: string): Promise<Report> {
    const report = this.reportRepository.create({
      ...createReportDto,
      reporterId,
      status: ReportStatus.PENDING,
      priority: createReportDto.priority || ModerationPriority.MEDIUM,
    });

    const savedReport = await this.reportRepository.save(report);

    // Notify moderators about new report
    await this.notificationService.notifyModerators({
      type: 'new_report',
      title: 'New content report',
      body: `A new ${createReportDto.category} report has been submitted`,
      priority: report.priority,
      metadata: {
        reportId: savedReport.id,
        contentType: savedReport.contentType,
        contentId: savedReport.contentId,
      },
    });

    return savedReport;
  }

  async findAll(filter: Partial<Report> = {}, page = 1, limit = 20): Promise<[Report[], number]> {
    return this.reportRepository.findAndCount({
      where: filter,
      skip: (page - 1) * limit,
      take: limit,
      order: {
        priority: 'DESC',
        createdAt: 'ASC',
      },
      relations: ['reporter', 'reported', 'actions', 'actions.moderator'],
    });
  }

  async findOne(id: string): Promise<Report> {
    return this.reportRepository.findOne({ 
      where: { id },
      relations: ['reporter', 'reported', 'actions', 'actions.moderator'],
    });
  }

  async updateStatus(
    id: string, 
    status: ReportStatus, 
    moderatorId?: string
  ): Promise<Report> {
    const report = await this.reportRepository.findOneBy({ id });
    
    if (!report) {
      throw new Error(`Report with ID ${id} not found`);
    }

    report.status = status;
    
    if (status === ReportStatus.IN_REVIEW && moderatorId) {
      // Potentially track which moderator is reviewing it in metadata or related entity
    }

    return this.reportRepository.save(report);
  }

  async getModeratorQueue(
    moderatorId: string, 
    status?: ReportStatus,
    priority?: ModerationPriority,
    page = 1,
    limit = 20,
  ): Promise<[Report[], number]> {
    const query = this.reportRepository.createQueryBuilder('report')
      .leftJoinAndSelect('report.reporter', 'reporter')
      .leftJoinAndSelect('report.reported', 'reported')
      .leftJoinAndSelect('report.actions', 'actions');

    if (status) {
      query.andWhere('report.status = :status', { status });
    } else {
      query.andWhere('report.status IN (:...statuses)', { 
        statuses: [ReportStatus.PENDING, ReportStatus.IN_REVIEW] 
      });
    }

    if (priority) {
      query.andWhere('report.priority = :priority', { priority });
    }

    query.orderBy('report.priority', 'DESC')
         .addOrderBy('report.createdAt', 'ASC')
         .skip((page - 1) * limit)
         .take(limit);

    return query.getManyAndCount();
  }
}