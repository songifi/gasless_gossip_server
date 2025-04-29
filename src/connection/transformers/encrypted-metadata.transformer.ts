// src/connection/transformers/encrypted-metadata.transformer.ts
import { ValueTransformer } from 'typeorm';
import * as crypto from 'crypto';

// Load encryption key from environment
const ENCRYPTION_KEY = Buffer.from(process.env.METADATA_ENCRYPTION_KEY || '', 'hex');
const IV_LENGTH = 16; // For AES, this is always 16 bytes

export class EncryptedMetadataTransformer implements ValueTransformer {
  // Encrypt metadata before storing in DB
  to(value: Record<string, any> | null): string | null {
    if (!value) return null;
    
    try {
      // Generate random initialization vector
      const iv = crypto.randomBytes(IV_LENGTH);
      
      // Create cipher with AES-256-CBC
      const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
      
      // Encrypt the JSON metadata
      let encrypted = cipher.update(JSON.stringify(value), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Prepend IV to encrypted data for use in decryption
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      return null;
    }
  }
  
  // Decrypt metadata when reading from DB
  from(value: string | null): Record<string, any> | null {
    if (!value) return null;
    
    try {
      // Split out IV from encrypted data
      const parts = value.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      // Create decipher
      const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
      
      // Decrypt and parse JSON
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  }
}