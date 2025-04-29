import { 
    Controller, 
    Post, 
    Get, 
    Patch, 
    Delete,
    Param, 
    Body, 
    Query, 
    UseGuards,
    Request,
    HttpException,
    HttpStatus,
  } from '@nestjs/common';
  import { ReportService } from '../services/report.service';
  import { FilterService } from '../services/filter.service';
  import { PenaltyService } from '../services/penalty.service';
  import { AuditService } from '../services/audit.service';
  import { ModerationActionDto } from '../dto/moderation-action.dto';
  import { CreateFilterRuleDto } from '../dto/filter-rule.dto';
  import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
  import { Roles } from '../../auth/decorators/roles.decorator';
  import { RolesGuard } from '../../auth/guards/roles.guard';
  import { ReportStatus } from '../interfaces/report-status.enum';
  import { ModerationPriority } from '../interfaces/moderation-priority.enum';
  import { PenaltyType } from '../interfaces/penalty-type.enum';
  
  @Controller('moderation')
  @UseGuards(JwtAuthGuard, RolesGuard)
  export class ModerationController {
    constructor(
      private readonly reportService: ReportService,
      private readonly filterService: FilterService,
      private readonly penaltyService: PenaltyService,
      private readonly auditService: AuditService,
    ) {}
  
    // Queue management
    @Roles('moderator')
    @Get('queue')
    async getQueue(
      @Request() req,
      @Query('status') status?: ReportStatus,
      @Query('priority') priority?: ModerationPriority,
      @Query('page') page = 1,
      @Query('limit') limit = 20,
    ) {
      try {
        return await this.reportService.getModeratorQueue(
          req.user.id,
          status,
          priority,
          page,
          limit,
        );
      } catch (error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  
    // Report actions
    @Roles('moderator')
    @Patch('reports/:id/status')
    async updateReportStatus(
      @Param('id') id: string,
      @Body('status') status: ReportStatus,
      @Request() req,
    ) {
      try {
        return await this.reportService.updateStatus(id, status, req.user.id);
      } catch (error) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  
    @Roles('moderator')
    @Post('actions')
    async createModerationAction(
      @Body() actionDto: ModerationActionDto,
      @Request() req,
    ) {
      try {
        // Implement method to create moderation action
        // This would typically involve:
        // 1. Creating the action record
        // 2. Updating the report status
        // 3. Possibly issuing penalties
        // 4. Notifying relevant users
        
        // For this example, we'll just return a success message
        return { message: 'Moderation action created successfully' };
      } catch (error) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  
    // Filter management
    @Roles('moderator')
    @Get('filters')
    async getFilters(@Query('isActive') isActive?: boolean) {
      try {
        return await this.filterService.getAllRules(isActive);
      } catch (error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  
    @Roles('moderator')
    @Post('filters')
    async createFilter(@Body() createRuleDto: CreateFilterRuleDto, @Request() req) {
      try {
        return await this.filterService.createRule(createRuleDto);
      } catch (error) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  
    @Roles('moderator')
    @Patch('filters/:id')
    async updateFilter(
      @Param('id') id: string,
      @Body() updateRuleDto: Partial<CreateFilterRuleDto>,
    ) {
      try {
        return await this.filterService.updateRule(id, updateRuleDto);
      } catch (error) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  
    @Roles('moderator')
    @Delete('filters/:id')
    async deleteFilter(@Param('id') id: string) {
      try {
        await this.filterService.deleteRule(id);
        return { message: 'Filter rule deleted successfully' };
      } catch (error) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  
    // Penalty management
    @Roles('moderator')
    @Post('penalties')
    async issuePenalty(
      @Body() penaltyData: {
        userId: string;
        type: PenaltyType;
        reason: string;
        duration?: number;
        metadata?: Record<string, any>;
      },
      @Request() req,
    ) {
      try {
        return await this.penaltyService.issuePenalty({
          ...penaltyData,
          issuedById: req.user.id,
        });
      } catch (error) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  
    @Roles('moderator')
    @Patch('penalties/:id/revoke')
    async revokePenalty(
      @Param('id') id: string,
      @Body('reason') reason: string,
      @Request() req,
    ) {
      try {
        return await this.penaltyService.revokePenalty(id, req.user.id, reason);
      } catch (error) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  
    @Roles('moderator')
    @Get('user/:userId/penalties')
    async getUserPenalties(@Param('userId') userId: string) {
      try {
        return await this.penaltyService.getUserPenaltyHistory(userId);
      } catch (error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  
    // Audit and stats
    @Roles('moderator')
    @Get('audit/moderator/:moderatorId')
    async getModeratorAudit(
      @Param('moderatorId') moderatorId: string,
      @Query('startDate') startDate?: string,
      @Query('endDate') endDate?: string,
      @Query('page') page = 1,
      @Query('limit') limit = 20,
    ) {
      try {
        return await this.auditService.getModeratorActions(
          moderatorId,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined,
          page,
          limit,
        );
      } catch (error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  
    @Roles('moderator')
    @Get('audit/content/:contentType/:contentId')
    async getContentAudit(
      @Param('contentType') contentType: string,
      @Param('contentId') contentId: string,
    ) {
      try {
        return await this.auditService.getContentModerationHistory(contentType, contentId);
      } catch (error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  
    @Roles('moderator')
    @Get('stats')
    async getStats(
      @Query('startDate') startDate: string,
      @Query('endDate') endDate: string,
    ) {
      try {
        return await this.auditService.generateModerationStats(
          new Date(startDate),
          new Date(endDate),
        );
      } catch (error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }