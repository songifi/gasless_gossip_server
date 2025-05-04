import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class PresenceUpdateDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['online', 'offline', 'away', 'busy'])
  status: 'online' | 'offline' | 'away' | 'busy';
}