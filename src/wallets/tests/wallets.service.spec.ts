import { Test, TestingModule } from '@nestjs/testing';
import { WalletsService } from '../wallets.service'; 
import { getRepositoryToken } from '@nestjs/typeorm';
import { Wallet } from '../entities/wallet.entity'; 
import { EmailService } from '../../common/services/email.service'; 

describe('WalletsService', () => {
  let service: WalletsService;

  const mockRepository = {
    create: jest.fn().mockReturnValue({}),
    save: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    findOneOrFail: jest.fn().mockResolvedValue({}),
  };

  const mockEmailService = {
    sendConfirmation: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        {
          provide: getRepositoryToken(Wallet),
          useValue: mockRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<WalletsService>(WalletsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should verify wallet signature', async () => {
    const result = await service.verifyWalletSignature('0x123', '0xabc', 'test');
    expect(result).toBeDefined();
  });

  it('should set primary wallet', async () => {
    await service.setPrimaryWallet('user1', 'wallet1');
    expect(mockRepository.update).toHaveBeenCalled();
  });

  it('should add wallet with confirmation', async () => {
    const dto = { address: '0x123' };
    await service.addWalletWithConfirmation(dto, 'user1');
    expect(mockRepository.save).toHaveBeenCalled();
    expect(mockEmailService.sendConfirmation).toHaveBeenCalled();
  });
});