// src/connection/repositories/block.repository.ts
import { Repository } from 'typeorm';
import { Block } from '../entities/block.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class BlockRepository {
  constructor(
    @InjectRepository(Block)
    private readonly repository: Repository<Block>,
  ) {}

  async findById(id: string): Promise<Block> {
    return this.repository.findOne({
      where: { id },
      relations: ['user', 'blocked'],
    });
  }

  async findByUsers(userId: string, blockedId: string): Promise<Block> {
    return this.repository.findOne({
      where: { userId, blockedId },
      relations: ['user', 'blocked'],
    });
  }

  async findAllByUser(userId: string): Promise<Block[]> {
    return this.repository.find({
      where: { userId },
      relations: ['blocked'],
    });
  }

  async isBlocked(userId: string, otherUserId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: [
        { userId, blockedId: otherUserId },
        { userId: otherUserId, blockedId: userId }
      ],
    });
    return count > 0;
  }

  async create(data: Partial<Block>): Promise<Block> {
    const block = this.repository.create(data);
    return this.repository.save(block);
  }

  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async removeBlock(userId: string, blockedId: string): Promise<void> {
    await this.repository.delete({ userId, blockedId });
  }
}