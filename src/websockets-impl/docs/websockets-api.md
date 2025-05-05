# WebSocket API Documentation

This document outlines the WebSocket events and protocols for the real-time messaging system.

## Connection

Connect to the WebSocket server at `/chat` namespace.

### Authentication

Authentication is required via one of these methods:

1. Query parameter: `?token=YOUR_JWT_TOKEN`
2. Authentication header: `Authorization: Bearer YOUR_JWT_TOKEN`
3. Cookie: `token=YOUR_JWT_TOKEN`

Example connection:

```javascript
const socket = io('https://api.example.com/chat', {
  transports: ['websocket'],
  query: { token: 'YOUR_JWT_TOKEN' }
});
```

## Events

### Client → Server Events

These events are emitted by the client and handled by the server.

#### `joinRoom`

Join a chat room to receive messages from it.

```javascript
socket.emit('joinRoom', 'room-id');
```

Response:
```javascript
// Success
socket.on('joinedRoom', (roomId) => {
  console.log(`Successfully joined room: ${roomId}`);
});
```

#### `leaveRoom`

Leave a chat room.

```javascript
socket.emit('leaveRoom', 'room-id');
```

Response:
```javascript
// Success
socket.on('leftRoom', (roomId) => {
  console.log(`Successfully left room: ${roomId}`);
});
```

#### `sendMessage`

Send a message to a room.

```javascript
socket.emit('sendMessage', {
  content: 'Hello world!',
  roomId: 'room-id',
  // Optional fields
  replyToId: 'message-id-to-reply-to',
  attachment: {
    url: 'https://example.com/file.jpg',
    type: 'image/jpeg',
    name: 'image.jpg'
  },
  metadata: {
    // Custom metadata
    customField: 'value'
  }
});
```

Response:
```javascript
// Success acknowledgment
socket.on('messageSent', (receipt) => {
  console.log(`Message sent with ID: ${receipt.id}`);
  console.log(`Timestamp: ${receipt.timestamp}`);
  console.log(`Status: ${receipt.status}`);
});
```

#### `typingIndicator`

Indicate that the user is typing in a room.

```javascript
socket.emit('typingIndicator', {
  roomId: 'room-id',
  isTyping: true // or false when stopped typing
});
```

#### `presenceUpdate`

Update the user's presence status.

```javascript
socket.emit('presenceUpdate', {
  status: 'online' // 'online', 'offline', 'away', or 'busy'
});
```

#### `readReceipt`

Mark a message as read.

```javascript
socket.emit('readReceipt', {
  messageId: 'message-id',
  roomId: 'room-id'
});
```

#### `heartbeat`

Send periodic heartbeat to keep the connection alive.

```javascript
// Send every 25-30 seconds
setInterval(() => {
  socket.emit('heartbeat');
}, 25000);
```

#### `syncMessages`

Request message history synchronization, typically after reconnection.

```javascript
socket.emit('syncMessages', {
  roomId: 'room-id',
  lastMessageId: 'last-known-message-id', // Optional
  limit: 50 // Optional, default is 50
});
```

Response:
```javascript
socket.on('syncComplete', (data) => {
  console.log(`Synced ${data.syncedMessageCount} messages for room ${data.roomId}`);
});
```

### Server → Client Events

These events are emitted by the server and should be handled by the client.

#### `newMessage`

Receive a new message.

```javascript
socket.on('newMessage', (message) => {
  console.log(`New message from ${message.sender}: ${message.content}`);
  // Handle the message in your UI
});
```

Message structure:
```javascript
{
  id: 'unique-message-id',
  content: 'Hello world!',
  sender: 'user-id',
  roomId: 'room-id',
  timestamp: '2023-05-04T15:30:45.123Z',
  replyToId: 'message-id', // Optional
  attachment: { /* attachment details */ }, // Optional
  metadata: { /* custom metadata */ } // Optional
}
```

#### `messageRead`

Notification that a message has been read by a user.

```javascript
socket.on('messageRead', (data) => {
  console.log(`Message ${data.messageId} was read by ${data.userId}`);
  // Update read status in your UI
});
```

#### `userTyping`

Notification that a user is typing.

```javascript
socket.on('userTyping', (data) => {
  console.log(`User ${data.userId} is ${data.isTyping ? 'typing' : 'not typing'} in room ${data.roomId}`);
  // Update typing indicator in your UI
});
```

#### `presenceUpdate`

Notification of a user's presence status change.

```javascript
socket.on('presenceUpdate', (data) => {
  console.log(`User ${data.userId} is now ${data.status}`);
  // Update user status in your UI
});
```

#### `userJoinedRoom`

Notification that a user joined a room.

```javascript
socket.on('userJoinedRoom', (data) => {
  console.log(`User ${data.userId} joined room at ${data.timestamp}`);
  // Update room participants in your UI
});
```

#### `userLeftRoom`

Notification that a user left a room.

```javascript
socket.on('userLeftRoom', (data) => {
  console.log(`User ${data.userId} left room at ${data.timestamp}`);
  // Update room participants in your UI
});
```

#### `disconnect`

Server-initiated disconnection.

```javascript
socket.on('disconnect', (reason) => {
  console.log(`Disconnected: ${reason}`);
  
  if (reason === 'io server disconnect') {
    // The disconnection was initiated by the server, you need to reconnect manually
    socket.connect();
  }
  // else the socket will automatically try to reconnect
});
```

## Error Handling

When an error occurs, you'll receive a `error` event:

```javascript
socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

Common error types:
- Authentication errors
- Rate limiting errors
- Validation errors
- Server errors

## Reconnection Strategy

The client should implement a reconnection strategy with exponential backoff:

```javascript
const socket = io('https://api.example.com/chat', {
  transports: ['websocket'],
  query: { token: 'YOUR_JWT_TOKEN' },
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000, // Start with 1s delay
  reconnectionDelayMax: 30000, // Maximum delay of 30s
  randomizationFactor: 0.5 // Add randomization to prevent all clients reconnecting at once
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`Reconnected after ${attemptNumber} attempts`);
  
  // Re-join all rooms after reconnection
  myRooms.forEach(roomId => socket.emit('joinRoom', roomId));
  
  // Sync missed messages
  myRooms.forEach(roomId => {
    socket.emit('syncMessages', {
      roomId,
      lastMessageId: getLastKnownMessageId(roomId)
    });
  });
});
```

## Performance Considerations

- Limit message size to 16KB or less
- Implement client-side throttling for high-frequency events like typing indicators
- Consider using connection pooling for very high-traffic applications
- Batch message synchronization when reconnecting after long disconnections
- Use binary transport when sending large volumes of data

## Security Considerations

- Always use secure WebSockets (wss://)
- Keep JWT tokens secure and handle token refresh appropriately
- Never send sensitive information in plain text
- Implement rate limiting to prevent abuse
- Validate message content and size on the server
- Use message encryption for highly sensitive communications