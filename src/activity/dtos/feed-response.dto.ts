// src/activity/dtos/feed-response.dto.ts
import { Expose, Type } from 'class-transformer';

class ActivityDto {
  @Expose()
  id: string;

  @Expose()
  type: string;

  @Expose()
  actorId: number;

  @Expose()
  payload: Record<string, any>;

  @Expose()
  createdAt: Date;

  @Expose()
  aggregationCount: number;
}

export class FeedItemDto {
  @Expose()
  id: number;

  @Expose()
  @Type(() => ActivityDto)
  activity: ActivityDto;

  @Expose()
  score: number;

  @Expose()
  read: boolean;

  @Expose()
  createdAt: Date;
}

export class FeedResponseDto {
  @Expose()
  @Type(() => FeedItemDto)
  items: FeedItemDto[];

  @Expose()
  nextCursor: string | null;

  @Expose()
  hasMore: boolean;
}