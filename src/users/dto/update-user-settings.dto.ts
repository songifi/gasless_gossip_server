import { IsBoolean, IsHexColor, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateUserSettingsDto {
  @IsOptional()
  preferences?: Record<string, any>;

  @IsOptional()
  notificationPrefs?: {
    @IsOptional() @IsBoolean() messages?: boolean;
    @IsOptional() @IsBoolean() transfers?: boolean;
    @IsOptional() @IsBoolean() mentions?: boolean;
  };

  @IsOptional()
  privacyPrefs?: {
    @IsOptional() @IsBoolean() showWalletAddress?: boolean;
    @IsOptional() @IsBoolean() showTransactionHistory?: boolean;
  };

  @IsOptional()
  themePrefs?: {
    @IsOptional() @IsBoolean() darkMode?: boolean;
    @IsOptional() @IsHexColor() primaryColor?: string;
    @IsOptional() @IsNumber() fontSize?: number;
  };
}