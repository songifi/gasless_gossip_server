import { Test } from '@nestjs/testing';
import { Server } from 'socket.io';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { WebsocketsModule } from '../websockets.module';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

describe('WebSockets Performance Tests', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let server: Server;
  const clientSockets: Socket[] = [];
  const PORT = 3001;
  const URL = `http://localhost:${PORT}`;
  
  // Helper to create authenticated socket connections
  const createClientWithAuth = (userId: string): Promise<Socket> => {
    const token = jwtService.sign({ sub: userId });
    const socket = io(`${URL}/chat`, {
      transports: ['websocket'],
      query: { token },
    });
    
    return new Promise((resolve) => {
      socket.on('connect', () => {
        resolve(socket);
      });
    });
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
        WebsocketsModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    jwtService = moduleRef.get<JwtService>(JwtService);
    
    await app.listen(PORT);
    server = app.get(Server);
  });

  afterAll(async () => {
    clientSockets.forEach((socket) => {
      socket.disconnect();
    });
    await app.close();
  });

  test('should handle high message throughput', async () => {
    // Create 50 client connections
    const CLIENTS = 50;
    const MESSAGES_PER_CLIENT = 20;
    const ROOM_ID = 'performance-test-room';
    
    // Create clients
    for (let i = 0; i < CLIENTS; i++) {
      const socket = await createClientWithAuth(`user-${i}`);
      socket.emit('joinRoom', ROOM_ID);
      clientSockets.push(socket);
    }
    
    // Wait for all clients to join the room
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Track received messages
    const receivedMessages = new Map<string, number>();
    for (let i = 0; i < CLIENTS; i++) {
      receivedMessages.set(`user-${i}`, 0);
      
      clientSockets[i].on('newMessage', (data) => {
        const currentCount = receivedMessages.get(`user-${i}`) || 0;
        receivedMessages.set(`user-${i}`, currentCount + 1);
      });
    }
    
    // Send messages from each client
    const startTime = Date.now();
    
    for (let i = 0; i < CLIENTS; i++) {
      for (let j = 0; j < MESSAGES_PER_CLIENT; j++) {
        clientSockets[i].emit('sendMessage', {
          content: `Test message ${j} from client ${i}`,
          roomId: ROOM_ID,
        });
        
        // Small delay to prevent overwhelming the system
        if (j % 5 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
    }
    
    // Wait for all messages to be received
    await new Promise((resolve) => setTimeout(resolve, 5000));
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Calculate total messages
    const totalMessages = CLIENTS * MESSAGES_PER_CLIENT;
    const messagesPerSecond = totalMessages / (duration / 1000);
    
    console.log(`Sent ${totalMessages} messages in ${duration}ms (${messagesPerSecond.toFixed(2)} msgs/sec)`);
    
    // Verify message delivery
    let totalReceived = 0;
    receivedMessages.forEach((count) => {
      totalReceived += count;
    });
    
    // Each message should be received by all clients except the sender
    const expectedReceived = totalMessages * (CLIENTS - 1);
    
    console.log(`Expected: ${expectedReceived}, Actual: ${totalReceived}`);
    expect(totalReceived).toBe(expectedReceived);
  });

  test('should handle connection spikes', async () => {
    // Create 100 connections in rapid succession
    const CONNECTION_COUNT = 100;
    const connectionsPerBatch = 10;
    const batches = Math.ceil(CONNECTION_COUNT / connectionsPerBatch);
    
    const startTime = Date.now();
    
    for (let batch = 0; batch < batches; batch++) {
      const batchConnections = [];
      
      for (let i = 0; i < connectionsPerBatch; i++) {
        const index = batch * connectionsPerBatch + i;
        batchConnections.push(createClientWithAuth(`spike-user-${index}`));
      }
      
      const newSockets = await Promise.all(batchConnections);
      clientSockets.push(...newSockets);
      
      // Brief pause between batches
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`Created ${CONNECTION_COUNT} connections in ${duration}ms (${(CONNECTION_COUNT / (duration / 1000)).toFixed(2)} conn/sec)`);
    
    // Verify connections
    expect(clientSockets.length).toBeGreaterThanOrEqual(CONNECTION_COUNT);
    
    // Cleanup these connections
    while (clientSockets.length > 0) {
      const socket = clientSockets.pop();
      socket.disconnect();
    }
  });

  // Add more performance tests as needed
});