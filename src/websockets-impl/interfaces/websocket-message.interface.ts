export interface WebsocketMessage {
  event: string;
  data: any;
  room?: string;
  userId?: string;
  messageId?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface TypingIndicator {
  userId: string;
  username?: string;
  roomId: string;
  isTyping: boolean;
  timestamp: string;
}

export interface PresenceStatus {
  userId: string;
  username?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastActive?: string;
}

export interface DeliveryReceipt {
  messageId: string;
  userId: string;
  status: 'sent' | 'delivered' | 'read';
  timestamp: string;
}

export interface ConnectionState {
  userId: string;
  socketId: string;
  isConnected: boolean;
  lastConnected?: string;
  lastDisconnected?: string;
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
    deviceId?: string;
  };
}