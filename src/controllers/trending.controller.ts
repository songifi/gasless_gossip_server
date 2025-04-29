import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../user/entities/user.entity';
import { TrendingService } from '../services/trending.service';
import { GetTrendingTopicsDto } from '../dto/trending.dto';

@ApiTags('discovery/trending')
@Controller('discovery/trending')
@UseGuards(JwtAuthGuard)
export class TrendingController {
  constructor(private readonly trendingService: TrendingService) {}

  @Get()
  @ApiOperation({ summary: 'Get trending topics' })
  @ApiResponse({ status: 200, description: 'Return trending topics' })
  async getTrendingTopics(
    @CurrentUser() user: User,
    @Query() queryDto: GetTrendingTopicsDto,
  ) {
    return this.trendingService.getTrendingTopics(
      queryDto.limit,
      queryDto.timeframe,
    );
  }

  @Get('personalized')
  @ApiOperation({ summary: 'Get personalized trending topics based on user interests' })
  @ApiResponse({ status: 200, description: 'Return personalized trending topics' })
  async getPersonalizedTrendingTopics(
    @CurrentUser() user: User,
    @Query() queryDto: GetTrendingTopicsDto,
  ) {
    return this.trendingService.getPersonalizedTrendingTopics(
      user.id,
      queryDto.limit,
      queryDto.timeframe,
    );
  }
}
