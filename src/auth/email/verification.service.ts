import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class VerificationService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private usersService: UsersService
  ) {}

  async sendVerificationEmail(email: string, userId: string) {
    const token = this.jwtService.sign(
      { email, userId },
      { expiresIn: '24h' }
    );
    
    await this.emailService.sendVerificationEmail(email, token);
  }

  async verifyEmail(token: string) {
    try {
      const { userId } = this.jwtService.verify(token);
      return this.usersService.markEmailAsVerified(userId);
    } catch (error) {
      throw new UnauthorizedException('Invalid verification token');
    }
  }
}