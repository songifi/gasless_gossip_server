import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { EmailService } from './email/email.service';
import { IsString, IsNotEmpty, IsEmail, MinLength } from 'class-validator';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<User> {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new UnauthorizedException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    // Create user
    const username = registerDto.email.split('@')[0]; // Generate username from email
    const user = await this.usersService.create({
      ...registerDto,
      username,
      password: hashedPassword,
    });

    // Send verification email
    await this.emailService.sendVerificationEmail(user.email, user.id);

    return user;
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: await this.generateRefreshToken(user.id),
    };
  }

  async refreshToken(token: string) {
    const userId = await this.verifyRefreshToken(token);
    const user = await this.usersService.findById(userId);
    
    return this.login(user);
  }

  async logout(userId: string): Promise<void> {
    await this.revokeAllUserTokens(userId);
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    // Implementation of refresh token generation
    return this.jwtService.sign(
      { sub: userId },
      { expiresIn: '7d' }
    );
  }

  private async verifyRefreshToken(token: string): Promise<string> {
    try {
      const payload = this.jwtService.verify(token);
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async revokeAllUserTokens(userId: string): Promise<void> {
    // Implementation of token revocation
    // This would typically involve adding the tokens to a blacklist
  }
}