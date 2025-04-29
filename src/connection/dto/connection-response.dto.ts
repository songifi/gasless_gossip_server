// src/connection/dto/connection-response.dto.ts
import { Exclude, Expose, Transform } from 'class-transformer';
import { ConnectionStatus } from '../enums/connection-status.enum';
import { ConnectionType } from '../enums/connection-type.enum';

export class ConnectionResponseDto {
  @Expose()
  id: string;

  @Expose()
  requesterId: string;

  @Expose()
  addresseeId: string;

  @Expose()
  @Transform(({ obj }) => ({
    id: obj.requester.id,
    username: obj.requester.username,
    displayName: obj.requester.displayName,
    avatarUrl: obj.requester.avatarUrl
  }))
  requester: any;

  @Expose()
  @Transform(({ obj }) => ({
    id: obj.addressee.id,
    username: obj.addressee.username,
    displayName: obj.addressee.displayName,
    avatarUrl: obj.addressee.avatarUrl
  }))
  addressee: any;

  @Expose()
  type: ConnectionType;

  @Expose()
  status: ConnectionStatus;

  @Expose()
  strength: number;

  @Expose()
  isFavorite: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  @Transform(({ obj, value }) => {
    // This transforms the connection data to expose the "other user" from the perspective of the current user
    return value || obj.currentUserId === obj.requesterId ? obj.addressee : obj.requester;
  })
  user: any;

  @Exclude()
  currentUserId: string;
}