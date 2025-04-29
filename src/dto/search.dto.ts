import { IsString, IsOptional, IsEnum, IsInt, Min, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum SearchType {
  USERS = 'users',
  CONTENT = 'content',
  COMMUNITIES = 'communities',
  ALL = 'all'
}

export class SearchDto {
  @ApiProperty({ description: 'Search query string' })
  @IsString()
  query: string;

  @ApiProperty({ enum: SearchType, default: SearchType.ALL })
  @IsEnum(SearchType)
  @IsOptional()
  type?: SearchType = SearchType.ALL;

  @ApiProperty({ default: 20, description: 'Number of results to retrieve' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;

  @ApiProperty({ default: 0, description: 'Number of results to skip' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  offset?: number = 0;

  @ApiProperty({ required: false, description: 'List of interests to prioritize in results' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  interests?: string[];
  
  @ApiProperty({ required: false, description: 'Filter by geographical proximity' })
  @IsOptional()
  nearLocation?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
}
