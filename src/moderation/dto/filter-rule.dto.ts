import { IsNotEmpty, IsString, IsBoolean, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { FilterAction } from '../interfaces/filter-action.enum';
import { ModerationPriority } from '../interfaces/moderation-priority.enum';

export class CreateFilterRuleDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  pattern: string;

  @IsOptional()
  @IsBoolean()
  isRegex?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(FilterAction)
  action?: FilterAction;

  @IsOptional()
  @IsEnum(ModerationPriority)
  priority?: ModerationPriority;

  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsString()
  category?: string;
}