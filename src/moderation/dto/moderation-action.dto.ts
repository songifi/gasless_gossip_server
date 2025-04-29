import { IsNotEmpty, IsString, IsUUID, IsOptional, IsBoolean } from 'class-validator';

export class ModerationActionDto {
  @IsNotEmpty()
  @IsUUID()
  reportId: string;

  @IsNotEmpty()
  @IsString()
  action: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isAutomated?: boolean;
}
