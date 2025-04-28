// src/users/users.module.ts
import { UserSettings } from './entities/user-settings.entity';
import { SettingsController } from './controllers/settings.controller';
import { SettingsService } from './services/settings.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
controllers: [UsersController, SettingsController],
providers: [UsersService, SettingsService],
exports: [UsersService, SettingsService], // Export for use in other modules (like auth)
})
export class UsersModule {}
