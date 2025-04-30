// src/services/user.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  async findByStarknetAddress(starknetAddress: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { starknetAddress } });
    if (!user) {
      throw new NotFoundException(`User with Starknet address "${starknetAddress}" not found`);
    }
    return user;
  }

  async create(username: string, starknetAddress: string, publicKey: string): Promise<User> {
    const user = this.userRepository.create({
      username,
      starknetAddress,
      publicKey,
    });
    return this.userRepository.save(user);
  }

  async updatePublicKey(userId: string, publicKey: string): Promise<User> {
    const user = await this.findById(userId);
    user.publicKey = publicKey;
    return this.userRepository.save(user);
  }
}