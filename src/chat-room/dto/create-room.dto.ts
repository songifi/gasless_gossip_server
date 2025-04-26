import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export enum RoomType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
}

export class CreateRoomDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(RoomType)
  type: RoomType; // DIRECT or GROUP

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean = false; // defaults to public if not set
}
