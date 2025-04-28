import { Test, TestingModule } from '@nestjs/testing';
import { ChatRoomController } from './chat-room.controller';
import { ChatRoomService } from './provider/chat-room.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from './guards/roles.guard';

describe('ChatRoomController', () => {
  let controller: ChatRoomController;

  const mockChatRoomService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatRoomController],
      providers: [
        {
          provide: ChatRoomService,
          useValue: mockChatRoomService,
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ChatRoomController>(ChatRoomController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});