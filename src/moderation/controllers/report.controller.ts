import { 
    Controller, 
    Post, 
    Get, 
    Param, 
    Body, 
    Query, 
    UseGuards,
    Request,
    HttpException,
    HttpStatus,
  } from '@nestjs/common';
  import { ReportService } from '../services/report.service';
  import { CreateReportDto } from '../dto/create-report.dto';
  import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
  import { ReportStatus } from '../interfaces/report-status.enum';
  import { ModerationPriority } from '../interfaces/moderation-priority.enum';
  
  @Controller('reports')
  export class ReportController {
    constructor(private readonly reportService: ReportService) {}
  
    @UseGuards(JwtAuthGuard)
    @Post()
    async create(@Request() req, @Body() createReportDto: CreateReportDto) {
      try {
        return await this.reportService.create(createReportDto, req.user.id);
      } catch (error) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  
    @UseGuards(JwtAuthGuard)
    @Get('my-reports')
    async getMyReports(
      @Request() req,
      @Query('page') page = 1,
      @Query('limit') limit = 20,
    ) {
      try {
        return await this.reportService.findAll(
          { reporterId: req.user.id },
          page,
          limit,
        );
      } catch (error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  
    @UseGuards(JwtAuthGuard)
    @Get(':id')
    async findOne(@Param('id') id: string, @Request() req) {
      try {
        const report = await this.reportService.findOne(id);
        
        if (!report) {
          throw new HttpException('Report not found', HttpStatus.NOT_FOUND);
        }
        
        // Check if the user is the reporter or a moderator
        if (report.reporterId !== req.user.id && !req.user.roles.includes('moderator')) {
          throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
        }
        
        return report;
      } catch (error) {
        throw new HttpException(
          error.message, 
          error.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }