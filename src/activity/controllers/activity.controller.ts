// src/activity/controllers/activity.controller.ts
import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    Query,
    UseGuards,
    HttpStatus,
    HttpCode,
    ParseUUIDPipe,
    ParseIntPipe,
    Patch,
  } from '@nestjs/common';
  import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
  import { ActivityService } from '../services/activity.service';
  import { FeedService } from '../services/feed.service';
  import { CreateActivityDto } from '../dtos/create-activity.dto';
  import { FeedQueryDto } from '../dtos/feed-query.dto';
  import { ActivityType } from '../enums/activity-type.enum';
  import { CurrentUser } from '../../decorators/current-user.decorator';
  
  @Controller('activity')
  export class ActivityController {
    constructor(
      private readonly activityService: ActivityService,
      private readonly feedService: FeedService,
    ) {}
  
    @Post()
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.CREATED)
    async createActivity(@Body() createActivityDto: CreateActivityDto) {
      return this.activityService.createActivity(createActivityDto);
    }
  
    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async getActivity(@Param('id', ParseUUIDPipe) id: string) {
      return this.activityService.getActivityById(id);
    }
  
    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteActivity(@Param('id', ParseUUIDPipe) id: string) {
      return this.activityService.deleteActivity(id);
    }
  
    @Get('user/:userId')
    @UseGuards(JwtAuthGuard)
    async getUserActivities(
      @Param('userId', ParseIntPipe) userId: number,
      @Query('limit', ParseIntPipe) limit = 20,
      @Query('offset', ParseIntPipe) offset = 0,
    ) {
      return this.activityService.getActivitiesByActor(userId, limit, offset);
    }
  
    @Get('feed')
    @UseGuards(JwtAuthGuard)
    async getFeed(
      @CurrentUser() user: any,
      @Query() feedQuery: FeedQueryDto,
    ) {
      return this.feedService.generateFeed(user.id, feedQuery);
    }
  
    @Post('subscribe/:publisherId')
    @UseGuards(JwtAuthGuard)
    async subscribe(
      @CurrentUser() user: any,
      @Param('publisherId', ParseIntPipe) publisherId: number,
      @Body('weight') weight = 1.0,
    ) {
      return this.feedService.subscribe(user.id, publisherId, weight);
    }
  
    @Post('unsubscribe/:publisherId')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    async unsubscribe(
      @CurrentUser() user: any,
      @Param('publisherId', ParseIntPipe) publisherId: number,
    ) {
      return this.feedService.unsubscribe(user.id, publisherId);
    }
  
    @Patch('feed/:feedItemId/read')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    async markFeedItemAsRead(
      @CurrentUser() user: any,
      @Param('feedItemId', ParseIntPipe) feedItemId: number,
    ) {
      return this.feedService.markFeedItemAsRead(user.id, feedItemId);
    }
  }