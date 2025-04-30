// src/services/session.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../entities/session.entity';
import { CryptoService } from './crypto.service';
import { UserService } from './user.service';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    private cryptoService: CryptoService,
    private userService: UserService,
  ) {}

  async getOrCreateSession(userIdA: string, userIdB: string): Promise<{ sessionId: string; key: Buffer }> {
    // Create a consistent key identifier regardless of which user is A or B
    const keyIdentifier = this.cryptoService.createSessionKeyIdentifier(userIdA, userIdB);
    
    // Check if session already exists
    let session = await this.sessionRepository.findOne({ where: { keyIdentifier } });
    
    if (!session) {
      // Fetch public keys for both users
      const userA = await this.userService.findById(userIdA);
      const userB = await this.userService.findById(userIdB);
      
      // Derive shared key from public keys
      const sharedKey = this.cryptoService.deriveSharedKey(userA.publicKey, userB.publicKey);
      
      // Create new session
      session = this.sessionRepository.create({
        userIdA,
        userIdB,
        keyIdentifier,
        // Optionally encrypt the session key with a server key for recovery
        // encryptedSessionKey: this.encryptSessionKey(sharedKey),
      });
      
      await this.sessionRepository.save(session);
      
      return { sessionId: session.id, key: sharedKey };
    }
    
    // For existing session, re-derive the key
    const userA = await this.userService.findById(session.userIdA);
    const userB = await this.userService.findById(session.userIdB);
    const sharedKey = this.cryptoService.deriveSharedKey(userA.publicKey, userB.publicKey);
    
    return { sessionId: session.id, key: sharedKey };
  }

  async getSessionKey(userId: string, otherUserId: string): Promise<Buffer> {
    const { key } = await this.getOrCreateSession(userId, otherUserId);
    return key;
  }
}