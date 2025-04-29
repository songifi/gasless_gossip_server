import { IsString, IsBoolean } from 'class-validator';

export class UpdatePreferenceDto {
  @IsString() notificationType: string;
  @IsString() channelId: string;
  @IsBoolean() enabled: boolean;
}