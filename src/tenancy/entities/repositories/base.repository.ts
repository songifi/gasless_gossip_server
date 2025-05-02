// src/repositories/base.repository.ts
import { Repository, FindOneOptions, FindManyOptions, DeepPartial } from 'typeorm';
import { SpaceContextService } from '../space/space-context.service';
import { BaseEntity } from '../entities/base.entity';

export abstract class BaseRepository<T extends BaseEntity> {
  constructor(
    private readonly repository: Repository<T>,
    private readonly spaceContextService: SpaceContextService,
  ) {}

  // Add space filtering to find operations
  async find(options?: FindManyOptions<T>): Promise<T[]> {
    const spaceId = this.spaceContextService.getSpaceId();
    const spaceOptions = {
      ...options,
      where: {
        ...(options?.where || {}),
        spaceId,
      },
    };
    
    return this.repository.find(spaceOptions);
  }

  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    const spaceId = this.spaceContextService.getSpaceId();
    const spaceOptions = {
      ...options,
      where: {
        ...(options.where || {}),
        spaceId,
      },
    };
    
    return this.repository.findOne(spaceOptions);
  }

  async create(entityLike: DeepPartial<T>): Promise<T> {
    const spaceId = this.spaceContextService.getSpaceId();
    return this.repository.create({
      ...entityLike,
      spaceId,
    });
  }

  async save(entity: DeepPartial<T>): Promise<T> {
    const spaceId = this.spaceContextService.getSpaceId();
    if (!entity.spaceId) {
      entity.spaceId = spaceId;
    }
    
    return this.repository.save(entity as any);
  }
}