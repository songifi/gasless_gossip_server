import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { io, Socket } from 'socket.io-client';
import { WebsocketsGateway } from '../websockets.gateway';
import { WebsocketsService } from '../services/websockets.service';
import { PresenceService } from '../services/presence.service';
import { MessageQueueService } from '../services/message-queue.service';
import { WebsocketEventLoggerService } from '../services/websocket-logger.service';
import { WebsocketMessage } from '../interfaces/websocket-message.interface';

// Create mocks
const mockWebsocketsService = {
  setMessageHandler: jest.fn(),
  publish: jest.fn(),
  getUndeliveredMessages: jest.fn().mockResolvedValue([]),
  recordDeliveryReceipt: jest.fn(),
};

const mockPresenceService = {
  updateUserPresence: jest.fn(),
  isUserOnline: jest.fn().mockResolvedValue(true),
  heartbeat: jest.fn(),
};

const mockMessageQueueService = {
  queueMessageForOfflineUser: jest.fn(),
  getQueuedMessagesForUser: jest.fn().mockResolvedValue([]),
  clearQueuedMessagesForUser: jest.fn(),
};

const mockEventLoggerService = {
  logConnectionEvent: jest.fn(),
  logIncomingMessage: jest.fn(),
  logOutgoingMessage: jest.fn(),
  logError: jest.fn(),
  logPerformanceMetric: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue(30000),
};

describe('WebsocketsGateway', () => {
  let app: INestApplication;
  let gateway: WebsocketsGateway;
  let jwtService: JwtService;
  let clientSocket: Socket;
  const PORT = 3002;
  const URL = `http://localhost:${PORT}/chat`;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [
        WebsocketsGateway,
        {
          provide: WebsocketsService,
          useValue: mockWebsocketsService,
        },
        {
          provide: PresenceService,
          useValue: mockPresenceService,
        },
        {
          provide: MessageQueueService,
          useValue: mockMessageQueueService,
        },
        {
          provide: WebsocketEventLoggerService,
          useValue: mockEventLoggerService,
        },
        {
          provide: 'ConfigService',
          useValue: mockConfigService,
        },
      ],
    }).compile();

    gateway = moduleRef.get<WebsocketsGateway>(WebsocketsGateway);
    jwtService = moduleRef.get<JwtService>(JwtService);

    // Create a mock server instance manually
    gateway.server = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
      emit: jest.fn(),
    } as any;

    app = moduleRef.createNestApplication();
    await app.listen(PORT);
  });

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create client with valid JWT token
    const token = jwtService.sign({ sub: 'test-user' });
    clientSocket = io(URL, {
      transports: ['websocket'],
      auth: {
        token,
      },
    });

    // Wait for connection
    await new Promise<void>((resolve) => {
      clientSocket.on('connect', () => {
        resolve();
      });
    });
  });

  afterEach(() => {
    clientSocket.disconnect();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Message Broadcasting', () => {
    it('should broadcast messages to rooms', async () => {
      const message: WebsocketMessage = {
        event: 'newMessage',
        data: { content: 'Hello world' },
        room: 'test-room',
      };

      gateway.handleRedisMessage(message);

      expect(gateway.server.to).toHaveBeenCalledWith('test-room');
      expect(gateway.server.to('test-room').emit).toHaveBeenCalledWith(
        'newMessage',
        message.data,
      );
    });

    it('should broadcast messages to specific users', async () => {
      const message: WebsocketMessage = {
        event: 'newMessage',
        data: { content: 'Hello user' },
        userId: 'test-user',
      };

      gateway.handleRedisMessage(message);

      expect(gateway.server.to).toHaveBeenCalledWith('user:test-user');
      expect(gateway.server.to('user:test-user').emit).toHaveBeenCalledWith(
        'newMessage',
        message.data,
      );
    });

    it('should broadcast messages to all clients', async () => {
      const message: WebsocketMessage = {
        event: 'announcement',
        data: { content: 'System announcement' },
      };

      gateway.handleRedisMessage(message);

      expect(gateway.server.emit).toHaveBeenCalledWith(
        'announcement',
        message.data,
      );
    });
  });

  describe('Room Management', () => {
    it('should handle join room requests', async () => {
      // Setup a mock client socket
      const mockClient = {
        id: 'socket-id',
        join: jest.fn(),
        data: { user: { sub: 'test-user' } },
      };

      const result = gateway.handleJoinRoom(mockClient as any, 'test-room');

      expect(mockClient.join).toHaveBeenCalledWith('test-room');
      expect(mockWebsocketsService.publish).toHaveBeenCalled();
      expect(result.event).toBe('joinedRoom');
      expect(result.data).toBe('test-room');
    });

    it('should handle leave room requests', async () => {
      // Setup a mock client socket
      const mockClient = {
        id: 'socket-id',
        leave: jest.fn(),
        data: { user: { sub: 'test-user' } },
      };

      const result = gateway.handleLeaveRoom(mockClient as any, 'test-room');

      expect(mockClient.leave).toHaveBeenCalledWith('test-room');
      expect(mockWebsocketsService.publish).toHaveBeenCalled();
      expect(result.event).toBe('leftRoom');
      expect(result.data).toBe('test-room');
    });
  });

  describe('Presence Management', () => {
    it('should update user presence', async () => {
      // Setup a mock client socket
      const mockClient = {
        id: 'socket-id',
        data: { user: { sub: 'test-user' } },
      };

      await gateway.handlePresenceUpdate(mockClient as any, { status: 'away' });

      expect(mockPresenceService.updateUserPresence).toHaveBeenCalledWith(
        'test-user',
        'away',
      );
      expect(mockWebsocketsService.publish).toHaveBeenCalled();
    });
  });

  describe('Message Delivery and Receipt', () => {
    it('should handle read receipts', async () => {
      // Setup a mock client socket
      const mockClient = {
        id: 'socket-id',
        data: { user: { sub: 'test-user' } },
      };

      await gateway.handleReadReceipt(mockClient as any, {
        messageId: 'msg-123',
        roomId: 'room-456',
      });

      expect(mockWebsocketsService.recordDeliveryReceipt).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: 'msg-123',
          userId: 'test-user',
          status: 'read',
        }),
      );

      expect(mockWebsocketsService.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'messageRead',
          room: 'room-456',
        }),
      );
    });

    it('should handle new messages', async () => {
      // Setup a mock client socket
      const mockClient = {
        id: 'socket-id',
        data: { user: { sub: 'test-user' } },
      };

      const result = await gateway.handleMessage(mockClient as any, {
        content: 'Test message',
        roomId: 'room-456',
      });

      expect(mockWebsocketsService.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'newMessage',
          room: 'room-456',
          data: expect.objectContaining({
            content: 'Test message',
          }),
        }),
      );

      expect(result).toEqual({
        event: 'messageSent',
        data: expect.objectContaining({
          status: 'sent',
        }),
      });
    });
  });

  describe('Typing Indicators', () => {
    it('should handle typing indicators', async () => {
      // Setup a mock client socket
      const mockClient = {
        id: 'socket-id',
        data: { user: { sub: 'test-user' } },
      };

      await gateway.handleTypingIndicator(mockClient as any, {
        roomId: 'room-456',
        isTyping: true,
      });

      expect(mockWebsocketsService.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'userTyping',
          room: 'room-456',
          data: expect.objectContaining({
            userId: 'test-user',
            isTyping: true,
          }),
        }),
      );
    });
  });

  // Add more test cases as needed
});