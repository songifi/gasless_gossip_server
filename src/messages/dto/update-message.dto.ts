import { IsOptional, IsString, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMessageDto {
  @ApiPropertyOptional({ description: 'Updated message content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Additional metadata for the message' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
