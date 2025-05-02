// src/space/space.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Space } from '../entities/space.entity';
import { SpaceUser } from '../entities/space-user.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class SpaceService {
  constructor(
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
    @InjectRepository(SpaceUser)
    private spaceUserRepository: Repository<SpaceUser>,
  ) {}

  async createSpace(name: string, ownerId: string, isPersonal = false): Promise<Space> {
    const space = this.spaceRepository.create({
      name,
      ownerId,
      isPersonal,
    });
    
    await this.spaceRepository.save(space);
    
    // Add the owner as an admin
    await this.addUserToSpace(ownerId, space.id, 'admin');
    
    return space;
  }

  async addUserToSpace(userId: string, spaceId: string, role: 'admin' | 'member' | 'guest'): Promise<SpaceUser> {
    const spaceUser = this.spaceUserRepository.create({
      user: { id: userId },
      space: { id: spaceId },
      role,
    });
    
    return await this.spaceUserRepository.save(spaceUser);
  }

  async getUserSpaces(userId: string): Promise<Space[]> {
    const spaceUsers = await this.spaceUserRepository.find({
      where: { user: { id: userId } },
      relations: ['space'],
    });
    
    return spaceUsers.map(su => su.space);
  }

  async checkUserAccess(userId: string, spaceId: string): Promise<boolean> {
    const spaceUser = await this.spaceUserRepository.findOne({
      where: {
        user: { id: userId },
        space: { id: spaceId },
      },
    });
    
    return !!spaceUser;
  }
}