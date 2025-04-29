
// src/activity/dtos/create-activity.dto.ts
import { IsEnum, IsNotEmpty, IsOptional, IsUUID, IsBoolean, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ActivityType } from '../enums/activity-type.enum';
import { TargetType } from '../enums/target-type.enum';

class ActivityTargetDto {
  @IsEnum(TargetType)
  targetType: TargetType;

  @IsNumber()
  targetId: number;
}

export class CreateActivityDto {
  @IsEnum(ActivityType)
  type: ActivityType;

  @IsNotEmpty()
  @IsNumber()
  actorId: number;

  @IsOptional()
  payload?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean = true;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ActivityTargetDto)
  targets?: ActivityTargetDto[];

  @IsOptional()
  groupKey?: string;
}

