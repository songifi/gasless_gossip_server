import { IsNotEmpty, IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ModerationPriority } from '../interfaces/moderation-priority.enum';

export class CreateReportDto {
  @IsNotEmpty()
  @IsString()
  contentType: string;

  @IsNotEmpty()
  @IsString()
  contentId: string;

  @IsNotEmpty()
  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsUUID()
  reportedId: string;

  @IsOptional()
  @IsEnum(ModerationPriority)
  priority?: ModerationPriority;
}
