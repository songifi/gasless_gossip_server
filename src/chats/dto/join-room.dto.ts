import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class JoinRoomDto {
  @IsNotEmpty()
  @IsUUID()
  roomId: string;

  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  userId: string;
}
