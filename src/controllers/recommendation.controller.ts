import { Controller, Get, Post, Body, Query, Param, UseGuards, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../user/entities/user.entity';
import { RecommendationService } from '../services/recommendation.service';
import { GetRecommendationsDto, DismissRecommendationDto } from '../dto/recommendation.dto';
import { RecommendationType } from '../entities/recommendation.entity';

@ApiTags('discovery/recommendations')
@Controller('discovery/recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get()
  @ApiOperation({ summary: 'Get recommendations for current user' })
  @ApiResponse({ status: 200, description: 'Return recommendations' })
  async getRecommendations(
    @CurrentUser() user: User,
    @Query() query: GetRecommendationsDto,
  ) {
    return this.recommendationService.getRecommendationsForUser(
      user.id,
      query.type,
      query.limit,
      query.offset,
    );
  }

  @Get('people')
  @ApiOperation({ summary: 'Get people recommendations for current user' })
  @ApiResponse({ status: 200, description: 'Return people recommendations' })
  async getPeopleRecommendations(
    @CurrentUser() user: User,
    @Query() query: GetRecommendationsDto,
  ) {
    return this.recommendationService.getRecommendationsForUser(
      user.id,
      RecommendationType.PERSON,
      query.limit,
      query.offset,
    );
  }

  @Get('content')
  @ApiOperation({ summary: 'Get content recommendations for current user' })
  @ApiResponse({ status: 200, description: 'Return content recommendations' })
  async getContentRecommendations(
    @CurrentUser() user: User,
    @Query() query: GetRecommendationsDto,
  ) {
    return this.recommendationService.getRecommendationsForUser(
      user.id,
      RecommendationType.CONTENT,
      query.limit,
      query.offset,
    );
  }

  @Get('communities')
  @ApiOperation({ summary: 'Get community recommendations for current user' })
  @ApiResponse({ status: 200, description: 'Return community recommendations' })
  async getCommunityRecommendations(
    @CurrentUser() user: User,
    @Query() query: GetRecommendationsDto,
  ) {
    return this.recommendationService.getRecommendationsForUser(
      user.id,
      RecommendationType.COMMUNITY,
      query.limit,
      query.offset,
    );
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Force refresh recommendations for current user' })
  @ApiResponse({ status: 200, description: 'Recommendations refreshed' })
  async refreshRecommendations(@CurrentUser() user: User) {
    await this.recommendationService.refreshRecommendationsForUser(user.id);
    return { message: 'Recommendations refresh initiated' };
  }

  @Post('dismiss')
  @ApiOperation({ summary: 'Dismiss a recommendation' })
  @ApiResponse({ status: 200, description: 'Recommendation dismissed' })
  async dismissRecommendation(
    @CurrentUser() user: User,
    @Body() dismissDto: DismissRecommendationDto,
  ) {
    await this.recommendationService.dismissRecommendation(user.id, dismissDto.recommendationId);
    return { message: 'Recommendation dismissed' };
  }
}
