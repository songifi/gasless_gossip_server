// client-side.ts
import * as crypto from 'crypto';

class E2EMessageClient {
  private sessionKeys: Map<string, Buffer> = new Map();
  private starknetAddress: string;
  private privateKey: crypto.KeyObject; // In a real app, this would be the Starknet private key

  constructor(starknetAddress: string) {
    this.starknetAddress = starknetAddress;
    // In a real app, this would be derived from the Starknet wallet
    this.privateKey = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
    }).privateKey;
  }

  // Register user with the server
  async registerUser(username: string): Promise<string> {
    // Generate a public key to share (in a real app, this would be from Starknet)
    const publicKey = this.privateKey.export({ type: 'pkcs1', format: 'pem' });
    
    // Register with the server
    const response = await fetch('http://localhost:3000/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        starknetAddress: this.starknetAddress,
        publicKey,
      }),
    });
    
    const user = await response.json();
    return user.id;
  }

  // Establish a session with another user
  async establishSession(otherUserId: string): Promise<void> {
    // In a real app, this would be done through a secure key exchange process
    // For simplicity, we're using the server as an intermediary
    const response = await fetch(`http://localhost:3000/users/${otherUserId}`, {
      headers: { 'Authorization': `Bearer ${this.getAuthToken()}` },
    });
    
    const otherUser = await response.json();
    
    // Derive shared key (in a real app, this would use ECDH)
    const sharedKey = this.deriveSharedKey(otherUser.publicKey);
    
    // Store session key
    this.sessionKeys.set(otherUserId, sharedKey);
  }

  // Send an encrypted message
  async sendMessage(recipientId: string, content: string): Promise<void> {
    // Ensure we have a session key
    if (!this.sessionKeys.has(recipientId)) {
      await this.establishSession(recipientId);
    }
    
    // Client-side encryption would happen here, but for our architecture
    // the server handles the actual encryption using the derived shared key
    await fetch('http://localhost:3000/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
      body: JSON.stringify({
        senderId: this.getUserId(),
        recipientId,
        content,
      }),
    });
  }

  // Get and decrypt messages
  async getMessages(otherUserId: string): Promise<any[]> {
    // Ensure we have a session key
    if (!this.sessionKeys.has(otherUserId)) {
      await this.establishSession(otherUserId);
    }
    
    // Get encrypted messages from server
    const response = await fetch(`http://localhost:3000/messages/${this.getUserId()}/${otherUserId}`, {
      headers: { 'Authorization': `Bearer ${this.getAuthToken()}` },
    });
    
    // Server already decrypts messages using the derived shared key
    return response.json();
  }

  // Helper methods
  private getUserId(): string {
    // This would be retrieved from the authenticated user session
    return 'user-id';
  }

  private getAuthToken(): string {
    // This would be retrieved from the authenticated user session
    return 'jwt-token';
  }

  private deriveSharedKey(otherPublicKey: string): Buffer {
    // In a real app, this would use ECDH with Starknet keys
    // For demo purposes, we're using a hash of the public keys
    const combined = this.privateKey.export({ type: 'pkcs1', format: 'pem' }) + otherPublicKey;
    return crypto.createHash('sha256').update(combined).digest();
  }
}