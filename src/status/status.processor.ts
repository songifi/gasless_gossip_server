import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageRecipient } from '../messages/entities/message-recipient.entity';
import { StatusUpdate } from '../messages/entities/status-update.entity';
import { StatusGateway } from './status.gateway';

@Injectable()
@Processor('status-updates')
export class StatusProcessor {
  constructor(
    @InjectRepository(MessageRecipient)
    private messageRecipientRepository: Repository<MessageRecipient>,
    
    @InjectRepository(StatusUpdate)
    private statusUpdateRepository: Repository<StatusUpdate>,
    
    private statusGateway: StatusGateway,
  ) {}

  @Process('update-status')
  async processStatusUpdate(job: Job<{
    messageId: string;
    recipientId: string;
    status: string;
  }>): Promise<void> {
    const { messageId, recipientId, status } = job.data;

    try {
      // Find the message recipient record
      const messageRecipient = await this.messageRecipientRepository.findOne({
        where: {
          messageId,
          recipientId,
        },
      });

      if (!messageRecipient) {
        throw new Error(`Message recipient record not found for message ${messageId} and recipient ${recipientId}`);
      }

      // Don't process status downgrades (e.g., from 'read' to 'delivered')
      if (
        (messageRecipient.status === 'read' && (status === 'delivered' || status === 'sent')) ||
        (messageRecipient.status === 'delivered' && status === 'sent')
      ) {
        return;
      }

      // Save previous status for history
      const previousStatus = messageRecipient.status;

      // Update status
      messageRecipient.status = status as any;
      messageRecipient.updatedAt = new Date();
      await this.messageRecipientRepository.save(messageRecipient);

      // Create status history record
      await this.statusUpdateRepository.save({
        messageRecipientId: messageRecipient.id,
        previousStatus,
        newStatus: status as any,
      });

      // Notify connected users via WebSocket
      // Notify sender about status change
      const message = await this.messageRecipientRepository
        .createQueryBuilder('mr')
        .innerJoinAndSelect('mr.message', 'm')
        .where('mr.id = :id', { id: messageRecipient.id })
        .getOne();

      if (message) {
        const senderId = message.message.senderId;
        if (this.statusGateway.isUserConnected(senderId)) {
          this.statusGateway.sendStatusUpdate(senderId, {
            messageId,
            recipientId,
            status,
            timestamp: messageRecipient.updatedAt,
          });
        }
      }
    } catch (error) {
      console.error(`Error processing status update for message ${messageId}:`, error);
      throw error;
    }
  }
}
