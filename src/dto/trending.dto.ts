import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetTrendingTopicsDto {
  @ApiProperty({ default: 10, description: 'Number of trending topics to retrieve' })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({ default: 'day', description: 'Timeframe for trending calculation' })
  @IsOptional()
  timeframe?: 'hour' | 'day' | 'week' = 'day';
}
