import { IsString, IsNotEmpty, IsBoolean } from 'class-validator';

export class TypingIndicatorDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsBoolean()
  isTyping: boolean;
}