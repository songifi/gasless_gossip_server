import { Test, TestingModule } from '@nestjs/testing';
import { WalletsController } from '../wallets.controller';
import { WalletsService } from '../wallets.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Wallet } from '../entities/wallet.entity';
import { WalletActivity } from '../entities/wallet-activity.entity';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { User } from '../../users/entities/user.entity';
import { StarkNetService } from '../../common/services/starknet.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

describe('WalletsController', () => {
  let controller: WalletsController;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    })),
  };

  const mockStarkNetService = {
    getBalance: jest.fn(),
    getTransactions: jest.fn(),
  };

  const mockSchedulerRegistry = {
    addInterval: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletsController],
      providers: [
        WalletsService,
        {
          provide: getRepositoryToken(Wallet),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(WalletActivity),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(WalletTransaction),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: StarkNetService,
          useValue: mockStarkNetService,
        },
        {
          provide: SchedulerRegistry,
          useValue: mockSchedulerRegistry,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WalletsController>(WalletsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});