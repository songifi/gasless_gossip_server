import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../app.module';
import { Message } from '../messages/entities/message.entity';
import { MessageRecipient } from '../messages/entities/message-recipient.entity';
import { StatusUpdate } from '../messages/entities/status-update.entity';

describe('Status Integration', () => {
  let app: INestApplication;
  let socket: Socket;
  let authToken: string;
  let testMessageId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    // Get auth token for API requests
    // This is a mock implementation - adjust to your auth system
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'testuser', password: 'password' });
    
    authToken = loginResponse.body.access_token;
    
    // Create test message
    const createMessageResponse = await request(app.getHttpServer())
      .post('/messages')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        content: 'Test message',
        conversationId: 'test-conversation',
        recipientIds: ['test-recipient'],
      });
    
    testMessageId = createMessageResponse.body.id;
    
    // Connect WebSocket client
    socket = io(`http://localhost:${app.getHttpServer().address().port}`, {
      query: { userId: 'test-user' },
      transports: ['websocket'],
    });
    
    // Wait for socket connection
    await new Promise<void>((resolve) => {
      socket.on('connect', () => {
        resolve();
      });
    });
  });

  afterAll(async () => {
    socket.disconnect();
    await app.close();
  });

  it('should update message status via REST API', async () => {
    const response = await request(app.getHttpServer())
      .post(`/status/${testMessageId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'delivered' })
      .expect(201);
    
    expect(response.body.success).toBe(true);
  });

  it('should receive status updates via WebSocket', (done) => {
    // Set up listener for status update
    socket.on('status:update', (data) => {
      expect(data.messageId).toBe(testMessageId);
      expect(data.status).toBe('read');
      done();
    });
    
    // Mark message as read via WebSocket
    socket.emit('status:read', { messageId: testMessageId });
  });
});
