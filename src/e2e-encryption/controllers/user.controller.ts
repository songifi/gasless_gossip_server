// src/controllers/user.controller.ts
import { Controller, Post, Body, Get, Param, Put } from '@nestjs/common';
import { UserService } from '../services/user.service';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Post()
  async createUser(
    @Body() createUserDto: { username: string; starknetAddress: string; publicKey: string }
  ) {
    return this.userService.create(
      createUserDto.username,
      createUserDto.starknetAddress,
      createUserDto.publicKey
    );
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Get('starknet/:address')
  async getUserByStarknetAddress(@Param('address') address: string) {
    return this.userService.findByStarknetAddress(address);
  }

  @Put(':id/public-key')
  async updatePublicKey(
    @Param('id') id: string,
    @Body() updateDto: { publicKey: string }
  ) {
    return this.userService.updatePublicKey(id, updateDto.publicKey);
  }
}