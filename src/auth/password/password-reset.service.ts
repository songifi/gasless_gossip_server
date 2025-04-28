import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service';
import { UsersService } from '../../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordResetService {
  constructor(
    private jwtService: JwtService,
    private emailService: EmailService,
    private usersService: UsersService
  ) {}

  async sendResetLink(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return; // Don't reveal user existence

    const token = this.jwtService.sign(
      { email, userId: user.id },
      { expiresIn: '1h' }
    );

    await this.emailService.sendPasswordResetEmail(email, token);
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const { userId } = this.jwtService.verify(token);
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await this.usersService.updatePassword(userId, hashedPassword);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }
}