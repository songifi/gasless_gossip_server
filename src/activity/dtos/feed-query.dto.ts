// src/activity/dtos/feed-query.dto.ts
import { IsOptional, IsEnum, IsInt, Min, Max, IsBoolean, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ActivityType } from '../enums/activity-type.enum';

export class FeedQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeRead?: boolean = false;

  @IsOptional()
  @IsEnum(ActivityType, { each: true })
  types?: ActivityType[];
}