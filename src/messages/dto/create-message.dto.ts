import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsUrl,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { MessageType } from '../entities/message.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({ description: 'Message content' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({ description: 'Chat room ID' })
  @IsNotEmpty()
  @IsUUID()
  chatRoomId: string;

  @ApiPropertyOptional({ enum: MessageType, description: 'Message type' })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @ApiPropertyOptional({ description: 'ID of the message being replied to' })
  @IsOptional()
  @IsUUID()
  replyToId?: string;

  @ApiPropertyOptional({ description: 'URL for media content' })
  @IsOptional()
  @IsUrl()
  mediaUrl?: string;

  @ApiPropertyOptional({ description: 'Media content type' })
  @IsOptional()
  @IsString()
  mediaType?: string;

  @ApiPropertyOptional({ description: 'Additional metadata for the message' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
