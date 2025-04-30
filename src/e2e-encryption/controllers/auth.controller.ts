// src/controllers/auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: { starknetAddress: string; signature: string }) {
    return this.authService.login(loginDto.starknetAddress, loginDto.signature);
  }
}