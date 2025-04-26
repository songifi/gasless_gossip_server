import { IsString, IsOptional } from 'class-validator';

export class InviteUserDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  role?: 'ADMIN' | 'MODERATOR' | 'MEMBER';
}