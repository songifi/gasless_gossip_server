// src/connection/dto/update-connection.dto.ts
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { ConnectionStatus } from '../enums/connection-status.enum';

export class UpdateConnectionDto {
  @IsEnum(ConnectionStatus)
  @IsOptional()
  status?: ConnectionStatus;

  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;
}