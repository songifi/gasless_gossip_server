import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import { toFileStream } from 'qrcode';
import { UsersService } from '../users/users.service';

@Injectable()
export class MfaService {
  constructor(private readonly usersService: UsersService) {}

  async generateSecret(userId: string) {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(
      userId,
      'GaslessGossip',
      secret
    );

    await this.usersService.setMfaSecret(userId, secret);
    return { secret, otpauthUrl };
  }

  async verifyToken(token: string, secret: string): Promise<boolean> {
    return authenticator.verify({ token, secret });
  }
}