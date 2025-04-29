// src/connection/dto/create-connection.dto.ts
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ConnectionType } from '../enums/connection-type.enum';

export class CreateConnectionDto {
  @IsUUID()
  @IsNotEmpty()
  addresseeId: string;

  @IsEnum(ConnectionType)
  @IsOptional()
  type?: ConnectionType = ConnectionType.FRIENDSHIP;

  @IsString()
  @IsOptional()
  message?: string;
}