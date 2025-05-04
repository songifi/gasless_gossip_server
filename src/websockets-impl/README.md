# WebSockets Implementation

This module provides a complete WebSocket integration for real-time messaging, implementing message broadcasting, connection management, and reconnection strategies.

## Features

- Authentication and authorization for WebSocket connections
- Real-time message broadcasting
- Room-based message routing
- Connection state management
- Message delivery acknowledgment
- Read receipts
- Typing indicators
- Presence updates (online/offline/away/busy)
- Message queueing for offline delivery
- Reconnection handling with message synchronization
- WebSocket event logging
- Rate limiting
- Load balancing support via Redis adapter

## Architecture

The WebSocket implementation uses:

- NestJS WebSockets module
- Socket.IO for WebSocket handling
- Redis for pub/sub across multiple server instances
- Bull for message queueing
- JWT for authentication

## Integration

To integrate this module with your application:

1. Import the `WebsocketsModule` in your main `AppModule`:

```typescript
// app.module.ts
import { WebsocketsModule } from './websockets-impl/websockets.module';

@Module({
  imports: [
    // ... other modules
    WebsocketsModule,
  ],
})
export class AppModule {}
```

2. Set up the Redis IO adapter in your `main.ts` file:

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupWebsocketAdapter } from './websockets-impl/main-adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Set up WebSocket adapter with Redis
  await setupWebsocketAdapter(app);
  
  // Other app configurations...
  
  await app.listen(3000);
}
bootstrap();
```

## Usage

### Sending Messages from Services

You can inject the WebSocket service into your other services to broadcast messages:

```typescript
// some.service.ts
import { Injectable } from '@nestjs/common';
import { WebsocketsService } from '../websockets-impl/services/websockets.service';

@Injectable()
export class SomeService {
  constructor(private readonly websocketsService: WebsocketsService) {}
  
  async notifyUser(userId: string, message: string): Promise<void> {
    await this.websocketsService.publish({
      event: 'notification',
      data: { message },
      userId,
    });
  }
  
  async broadcastToRoom(roomId: string, message: string): Promise<void> {
    await this.websocketsService.publish({
      event: 'newMessage',
      data: { 
        content: message,
        timestamp: new Date().toISOString(),
      },
      room: roomId,
    });
  }
}
```

### Client Connection Example

```javascript
// Client-side JavaScript
import { io } from 'socket.io-client';

// Connect with authentication
const socket = io('https://your-api.com/chat', {
  transports: ['websocket'],
  query: { token: 'YOUR_JWT_TOKEN' },
  reconnection: true
});

// Handle connection events
socket.on('connect', () => {
  console.log('Connected to server');
  
  // Join a room
  socket.emit('joinRoom', 'room-id');
});

// Handle incoming messages
socket.on('newMessage', (message) => {
  console.log('New message:', message);
});

// Send a message
function sendMessage(content) {
  socket.emit('sendMessage', {
    content,
    roomId: 'room-id'
  });
}

// Handle typing indicators
socket.on('userTyping', (data) => {
  console.log(`User ${data.userId} is ${data.isTyping ? 'typing' : 'not typing'}`);
});

// Send typing status
function sendTypingStatus(isTyping) {
  socket.emit('typingIndicator', {
    roomId: 'room-id',
    isTyping
  });
}
```

## Performance Testing

The module includes performance tests to ensure it can handle:

- High message throughput
- Connection spikes
- Reconnection scenarios

To run the performance tests:

```bash
npm test -- --testPathPattern=websockets-impl/tests/performance.test.ts
```

## API Documentation

For detailed API documentation, see [websockets-api.md](./docs/websockets-api.md).