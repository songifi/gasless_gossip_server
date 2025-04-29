import { IsEnum, IsUUID, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { RecommendationType } from '../entities/recommendation.entity';

export class GetRecommendationsDto {
  @ApiProperty({ enum: RecommendationType, enumName: 'RecommendationType' })
  @IsEnum(RecommendationType)
  @IsOptional()
  type?: RecommendationType;

  @ApiProperty({ default: 10, description: 'Number of recommendations to retrieve' })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({ default: 0, description: 'Number of recommendations to skip' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  offset?: number = 0;
}

export class DismissRecommendationDto {
  @ApiProperty({ description: 'Recommendation ID to dismiss' })
  @IsUUID()
  recommendationId: string;
}
