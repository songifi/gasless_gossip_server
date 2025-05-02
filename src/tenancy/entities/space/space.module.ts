// src/space/space.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Space } from '../entities/space.entity';
import { SpaceUser } from '../entities/space-user.entity';
import { SpaceService } from './space.service';
import { SpaceController } from './space.controller';
import { SpaceContextService } from './space-context.service';

@Module({
  imports: [TypeOrmModule.forFeature([Space, SpaceUser])],
  providers: [SpaceService, SpaceContextService],
  controllers: [SpaceController],
  exports: [SpaceService, SpaceContextService],
})
export class SpaceModule {}