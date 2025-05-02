// crypto-client.ts
import * as sodium from 'libsodium-wrappers';

export class CryptoClient {
  private keyPair: sodium.KeyPair;
  private serverPublicKey: Uint8Array;
  private userId: string;
  private apiUrl: string;
  
  constructor(userId: string, apiUrl: string) {
    this.userId = userId;
    this.apiUrl = apiUrl;
  }
  
  async initialize() {
    // Wait for libsodium to initialize
    await sodium.ready;
    
    // Generate client keypair
    this.keyPair = sodium.crypto_box_keypair();
    
    // Fetch server's public key
    const response = await fetch(${this.apiUrl}/key-exchange/server-public-key);
    const data = await response.json();
    this.serverPublicKey = sodium.from_base64(data.publicKey);
    
    // Register our public key with the server
    await fetch(${this.apiUrl}/key-exchange/${this.userId}, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        publicKey: sodium.to_base64(this.keyPair.publicKey),
      }),
    });
    
    console.log('Crypto client initialized');
  }
  
  // Compute shared secret for decryption
  computeSharedSecret(): Uint8Array {
    return sodium.crypto_box_beforenm(
      this.serverPublicKey,
      this.keyPair.privateKey
    );
  }
  
  // Decrypt messages received from the server
  decryptMessage(encryptedBase64: string): string {
    const encryptedFull = sodium.from_base64(encryptedBase64);
    
    // Extract nonce and ciphertext
    const nonce = encryptedFull.slice(0, sodium.crypto_secretbox_NONCEBYTES);
    const ciphertext = encryptedFull.slice(sodium.crypto_secretbox_NONCEBYTES);
    
    // Compute shared secret
    const sharedSecret = this.computeSharedSecret();
    
    // Decrypt the message
    const decrypted = sodium.crypto_secretbox_open_easy(
      ciphertext,
      nonce,
      sharedSecret
    );
    
    return new TextDecoder().decode(decrypted);
  }
  
  // Encrypt messages to send to the server
  encryptMessage(message: string): string {
    const messageBytes = new TextEncoder().encode(message);
    const sharedSecret = this.computeSharedSecret();
    
    // Generate a nonce
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    
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
    
    return sodium.to_base64(result);
  }
}