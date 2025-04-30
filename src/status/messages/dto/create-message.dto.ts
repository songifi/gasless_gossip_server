import { IsUUID, IsNotEmpty, IsString, IsArray } from 'class-validator';

export class CreateMessageDto {
  @IsNotEmpty()
  @IsString()
  content: string;

  @IsUUID()
  conversationId: string;

  @IsArray()
  @IsUUID(undefined, { each: true })
  recipientIds: string[];
}
