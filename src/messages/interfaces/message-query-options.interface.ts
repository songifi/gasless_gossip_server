import { MessageType } from '../entities/message.entity';

export interface MessageQueryOptions {
  chatRoomId: string;
  limit?: number;
  cursor?: string; // ISO string of createdAt date for cursor-based pagination
  senderId?: string;
  type?: MessageType;
  search?: string;
  includeDeleted?: boolean;
  orderDirection?: 'ASC' | 'DESC';
}
