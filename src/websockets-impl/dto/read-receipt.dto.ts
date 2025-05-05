import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class ReadReceiptDto {
  @IsUUID()
  @IsNotEmpty()
  messageId: string;

  @IsString()
  @IsNotEmpty()
  roomId: string;
}