import { IsEnum } from 'class-validator';
import { MessageStatus } from '../../messages/entities/message-recipient.entity';

export class UpdateStatusDto {
  @IsEnum(MessageStatus)
  status: MessageStatus;
}
