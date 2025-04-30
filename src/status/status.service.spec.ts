import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { StatusService } from './status.service';
import { StatusGateway } from './status.gateway';
import { MessageRecipient } from '../messages/entities/message-recipient.entity';

describe('StatusService', () => {
  let service: StatusService;
  let statusQueue: any;
  let messageRecipientRepository: any;
  let statusGateway: any;

  beforeEach(async () => {
    statusQueue = {
      add: jest.fn(),
    };
    
    messageRecipientRepository = {
      createQueryBuilder: jest.fn(() => ({
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
    };
    
    statusGateway = {
      sendStatusUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatusService,
        {
          provide: getQueueToken('status-updates'),
          useValue: statusQueue,
        },
        {
          provide: getRepositoryToken(MessageRecipient),
          useValue: messageRecipientRepository,
        },
        {
          provide: StatusGateway,
          useValue: statusGateway,
        },
      ],
    }).compile();

    service = module.get<StatusService>(StatusService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateMessageStatus', () => {
    it('should add status update to queue', async () => {
      await service.updateMessageStatus('message-id', 'recipient-id', 'read');
      
      expect(statusQueue.add).toHaveBeenCalledWith(
        'update-status',
        {
          messageId: 'message-id',
          recipientId: 'recipient-id',
          status: 'read',
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      );
    });
  });

  // Add more tests for syncStatusUpdatesForUser and other methods
});
