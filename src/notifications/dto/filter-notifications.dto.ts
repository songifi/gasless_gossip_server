import { IsOptional, IsString, IsEnum } from 'class-validator';

export class FilterNotificationsDto {
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsEnum(['unread', 'read', 'archived']) status?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() limit?: string;
}