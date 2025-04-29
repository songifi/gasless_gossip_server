// src/connection/dto/connection-query.dto.ts
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ConnectionStatus } from '../enums/connection-status.enum';
import { ConnectionType } from '../enums/connection-type.enum';

export class ConnectionQueryDto {
  @IsEnum(ConnectionType)
  @IsOptional()
  type?: ConnectionType;

  @IsEnum(ConnectionStatus)
  @IsOptional()
  status?: ConnectionStatus;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  sortBy?: 'createdAt' | 'strength' = 'createdAt';

  @IsString()
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @IsString()
  @IsOptional()
  limit?: string = '20';

  @IsString()
  @IsOptional()
  offset?: string = '0';
}
