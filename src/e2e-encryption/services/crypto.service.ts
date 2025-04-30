// src/services/crypto.service.ts
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  // Generate a random key for encrypting messages
  generateSymmetricKey(): Buffer {
    return crypto.randomBytes(32); // 256 bits for AES-256
  }

  // Encrypt data using AES-256-GCM
  encryptWithSymmetricKey(data: string, key: Buffer): { encryptedData: string; iv: string } {
    const iv = crypto.randomBytes(16); // Generate initialization vector
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    // Combine encrypted data with auth tag
    const encryptedWithAuthTag = Buffer.concat([
      Buffer.from(encrypted, 'base64'),
      authTag
    ]).toString('base64');
    
    return {
      encryptedData: encryptedWithAuthTag,
      iv: iv.toString('base64')
    };
  }

  // Decrypt data using AES-256-GCM
  decryptWithSymmetricKey(encryptedData: string, iv: string, key: Buffer): string {
    const ivBuffer = Buffer.from(iv, 'base64');
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');
    
    // Extract auth tag (last 16 bytes)
    const authTag = encryptedBuffer.slice(encryptedBuffer.length - 16);
    const encryptedContent = encryptedBuffer.slice(0, encryptedBuffer.length - 16);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuffer);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedContent);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  }

  // Derive a shared session key from two public keys using ECDH
  // Note: In a real implementation, this would use actual ECDH with the Starknet keys
  deriveSharedKey(publicKeyA: string, publicKeyB: string): Buffer {
    // For demo purposes, we're using a hash of the two public keys
    // In a real implementation, proper ECDH key derivation would be used
    const combined = publicKeyA + publicKeyB;
    return crypto.createHash('sha256').update(combined).digest();
  }

  // Create a session key identifier from two user IDs
  createSessionKeyIdentifier(userIdA: string, userIdB: string): string {
    // Sort IDs to ensure the same identifier regardless of order
    const sortedIds = [userIdA, userIdB].sort().join('_');
    return crypto.createHash('sha256').update(sortedIds).digest('hex');
  }
}