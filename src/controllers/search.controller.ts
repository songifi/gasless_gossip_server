import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../user/entities/user.entity';
import { SearchService } from '../services/search.service';
import { SearchDto } from '../dto/search.dto';

@ApiTags('discovery/search')
@Controller('discovery/search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search for users, content, or communities' })
  @ApiResponse({ status: 200, description: 'Return search results' })
  async search(
    @CurrentUser() user: User,
    @Query() searchDto: SearchDto,
  ) {
    return this.searchService.search(
      user.id,
      searchDto.query,
      searchDto.type,
      {
        limit: searchDto.limit,
        offset: searchDto.offset,
        interests: searchDto.interests,
        nearLocation: searchDto.nearLocation,
      },
    );
  }
}
