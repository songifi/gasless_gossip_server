import { 
    Controller, 
    Post, 
    Get, 
    Patch, 
    Param, 
    Body, 
    Query, 
    UseGuards,
    Request,
    HttpException,
    HttpStatus,
  } from '@nestjs/common';
  import { AppealService } from '../services/appeal.service';
  import { CreateAppealDto, ReviewAppealDto } from '../dto/appeal.dto';
  import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
  import { Roles } from '../../auth/decorators/roles.decorator';
  import { RolesGuard } from '../../auth/guards/roles.guard';
  
  @Controller('appeals')
  @UseGuards(JwtAuthGuard)
  export class AppealController {
    constructor(private readonly appealService: AppealService) {}
  
    @Post()
    async create(@Request() req, @Body() createAppealDto: CreateAppealDto) {
      try {
        return await this.appealService.createAppeal(req.user.id, createAppealDto);
      } catch (error) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  
    @Get('my-appeals')
    async getMyAppeals(@Request() req) {
      try {
        return await this.appealService.getUserAppeals(req.user.id);
      } catch (error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  
    @UseGuards(RolesGuard)
    @Roles('moderator')
    @Get()
    async getPendingAppeals(
      @Query('page') page = 1,
      @Query('limit') limit = 20,
    ) {
      try {
        return await this.appealService.getPendingAppeals(page, limit);
      } catch (error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  
    @UseGuards(RolesGuard)
    @Roles('moderator')
    @Patch(':id/review')
    async reviewAppeal(
      @Param('id') id: string,
      @Body() reviewAppealDto: ReviewAppealDto,
      @Request() req,
    ) {
      try {
        return await this.appealService.reviewAppeal(
          id,
          req.user.id,
          reviewAppealDto,
        );
      } catch (error) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  }
  