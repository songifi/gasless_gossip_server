// src/services/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from './user.service';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  constructor(private userService: UserService) {}

  async validateStarknetSignature(starknetAddress: string, message: string, signature: string): Promise<boolean> {
    // In a real implementation, this would validate the Starknet signature
    // using the starknet.js library
    return true; // Stub for demo purposes
  }

  async login(starknetAddress: string, signature: string): Promise<{ accessToken: string }> {
    // Message that was signed (in a real app, this would be a challenge)
    const message = 'Login to E2E Encrypted Messaging App';
    
    // Validate signature
    const isValid = await this.validateStarknetSignature(starknetAddress, message, signature);
    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }
    
    // Find user by Starknet address
    const user = await this.userService.findByStarknetAddress(starknetAddress);
    
    // Generate JWT token
    const payload = { sub: user.id, username: user.username };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    return { accessToken };
  }
}