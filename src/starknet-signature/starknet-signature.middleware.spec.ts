
import { Test, TestingModule } from '@nestjs/testing';
import { StarknetSignatureMiddleware } from './starknet-signature.middleware';
import { HttpException } from '@nestjs/common';
import { ec, stark } from 'starknet';
import { Socket } from 'socket.io';
import { WsException } from '@nestjs/websockets';

describe('StarknetSignatureMiddleware', () => {
  let middleware: StarknetSignatureMiddleware;
  let mockPrivateKey: string;
  let mockPublicKey: string;
  let mockKeyPair: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StarknetSignatureMiddleware],
    }).compile();

    middleware = module.get<StarknetSignatureMiddleware>(StarknetSignatureMiddleware);
    
    // Generate test keys
    mockPrivateKey = '0x123456789abcdef';
    mockKeyPair = ec.getKeyPair(mockPrivateKey);
    mockPublicKey = ec.getStarkKey(mockKeyPair);
  });

  describe('HTTP Middleware', () => {
    it('should pass with valid signature', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const method = 'GET';
      const path = '/protected';
      const body = {};
      const message = `${method}:${path}:${JSON.stringify(body)}:${timestamp}`;
      const messageHash = stark.hashMessage(message);
      const signature = ec.sign(mockKeyPair, messageHash);
      
      const mockRequest = {
        method: method,
        originalUrl: path,
        body: body,
        headers: {
          'x-starknet-public-key': mockPublicKey,
          'x-starknet-signature': signature,
          'x-starknet-timestamp': timestamp
        }
      };
      
      const mockResponse = {};
      const mockNext = jest.fn();
      
      await middleware.use(mockRequest as any, mockResponse as any, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest['starknetPublicKey']).toBe(mockPublicKey);
    });
    
    it('should reject with missing headers', async () => {
      const mockRequest = {
        method: 'GET',
        originalUrl: '/protected',
        body: {},
        headers: {}
      };
      
      const mockResponse = {};
      const mockNext = jest.fn();
      
      await expect(middleware.use(mockRequest as any, mockResponse as any, mockNext))
        .rejects.toThrow(HttpException);
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should reject with expired timestamp', async () => {
      const expiredTimestamp = (Math.floor(Date.now() / 1000) - 600).toString(); // 10 mins ago
      const method = 'GET';
      const path = '/protected';
      const body = {};
      const message = `${method}:${path}:${JSON.stringify(body)}:${expiredTimestamp}`;
      const messageHash = stark.hashMessage(message);
      const signature = ec.sign(mockKeyPair, messageHash);
      
      const mockRequest = {
        method: method,
        originalUrl: path,
        body: body,
        headers: {
          'x-starknet-public-key': mockPublicKey,
          'x-starknet-signature': signature,
          'x-starknet-timestamp': expiredTimestamp
        }
      };
      
      const mockResponse = {};
      const mockNext = jest.fn();
      
      await expect(middleware.use(mockRequest as any, mockResponse as any, mockNext))
        .rejects.toThrow('Request timestamp expired or invalid');
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should reject with invalid signature', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const invalidSignature = '0x123invalidSignature456';
      
      const mockRequest = {
        method: 'GET',
        originalUrl: '/protected',
        body: {},
        headers: {
          'x-starknet-public-key': mockPublicKey,
          'x-starknet-signature': invalidSignature,
          'x-starknet-timestamp': timestamp
        }
      };
      
      const mockResponse = {};
      const mockNext = jest.fn();
      
      await expect(middleware.use(mockRequest as any, mockResponse as any, mockNext))
        .rejects.toThrow(HttpException);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
  
  describe('WebSocket Verification', () => {
    it('should verify valid WebSocket connection', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const path = '/socket';
      const messageData = '';
      const message = `WS:${path}:${messageData}:${timestamp}`;
      const messageHash = stark.hashMessage(message);
      const signature = ec.sign(mockKeyPair, messageHash);
      
      const mockClient = {
        id: 'test-client-id',
        handshake: {
          url: path,
          headers: {
            'x-starknet-public-key': mockPublicKey,
            'x-starknet-signature': signature,
            'x-starknet-timestamp': timestamp
          }
        },
        disconnect: jest.fn()
      };
      
      const result = await middleware.verifyWsConnection(mockClient as unknown as Socket, null);
      
      expect(result).toBe(true);
      expect(mockClient['starknetPublicKey']).toBe(mockPublicKey);
    });
    
    it('should reject WebSocket with invalid signature', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const invalidSignature = '0x123invalidSignature456';
      
      const mockClient = {
        id: 'test-client-id',
        handshake: {
          url: '/socket',
          headers: {
            'x-starknet-public-key': mockPublicKey,
            'x-starknet-signature': invalidSignature,
            'x-starknet-timestamp': timestamp
          }
        }
      };
      
      await expect(middleware.verifyWsConnection(mockClient as unknown as Socket, null))
        .rejects.toThrow(WsException);
    });
  });
});