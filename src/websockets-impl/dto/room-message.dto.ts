import { IsString, IsNotEmpty, IsOptional, IsObject, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class MessageAttachment {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class RoomMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsUUID()
  @IsOptional()
  replyToId?: string;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => MessageAttachment)
  attachment?: MessageAttachment;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}