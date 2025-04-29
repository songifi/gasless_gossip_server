import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: configService.get('SMTP_HOST'),
      port: configService.get('SMTP_PORT'),
      secure: true,
      auth: {
        user: configService.get('SMTP_USER'),
        pass: configService.get('SMTP_PASS'),
      },
    });
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${this.configService.get('APP_URL')}/verify-email?token=${token}`;
    
    await this.transporter.sendMail({
      to: email,
      subject: 'Verify your email address',
      html: `Please click <a href="${verificationUrl}">here</a> to verify your email.`,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.configService.get('APP_URL')}/reset-password?token=${token}`;
    
    await this.transporter.sendMail({
      to: email,
      subject: 'Reset your password',
      html: `Please click <a href="${resetUrl}">here</a> to reset your password.`,
    });
  }
}