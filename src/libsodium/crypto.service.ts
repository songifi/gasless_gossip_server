// crypto.service.ts
import { Injectable } from '@nestjs/common';
import * as sodium from 'libsodium-wrappers';

@Injectable()
export class CryptoService {
  private serverKeyPair: sodium.KeyPair;
  
  // Store client public keys mapped to user IDs
  private clientPublicKeys: Map<string, Uint8Array> = new Map();
  
  async onModuleInit() {
    // Wait for libsodium to initialize
    await sodium.ready;
    
    // Generate the server's keypair
    this.serverKeyPair = sodium.crypto_box_keypair();
    
    console.log('Cryptography service initialized');
  }
  
  getServerPublicKey(): Uint8Array {
    return this.serverKeyPair.publicKey;
  }
  
  storeClientPublicKey(userId: string, publicKey: Uint8Array): void {
    this.clientPublicKeys.set(userId, publicKey);
  }
  
  getClientPublicKey(userId: string): Uint8Array | undefined {
    return this.clientPublicKeys.get(userId);
  }
  
  // Generate a shared secret using X25519
  computeSharedSecret(clientPublicKey: Uint8Array): Uint8Array {
    return sodium.crypto_box_beforenm(
      clientPublicKey,
      this.serverKeyPair.privateKey
    );
  }
  
  // Encrypt a message using the shared secret
  encryptMessage(message: string, recipientId: string): string {
    const clientPublicKey = this.getClientPublicKey(recipientId);
    if (!clientPublicKey) {
      throw new Error('Client public key not found');
    }
    
    const sharedSecret = this.computeSharedSecret(clientPublicKey);
    const messageBytes = Buffer.from(message, 'utf-8');
    
    // Generate a nonce
    const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
    
    // Encrypt the message
    const ciphertext = sodium.crypto_secretbox_easy(
      messageBytes,
      nonce,
      sharedSecret
    );
    
    // Combine nonce and ciphertext for transmission
    const result = new Uint8Array(nonce.length + ciphertext.length);
    result.set(nonce);
    result.set(ciphertext, nonce.length);
    
    // Return as base64 for easy storage/transmission
    return sodium.to_base64(result);
  }
}