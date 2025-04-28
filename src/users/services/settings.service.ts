import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSettings } from '../entities/user-settings.entity';
import { UpdateUserSettingsDto } from '../dto/update-user-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(UserSettings)
    private settingsRepository: Repository<UserSettings>,
  ) {}

  async createDefaultSettings(userId: string) {
    const settings = this.settingsRepository.create({ user: { id: userId } });
    return this.settingsRepository.save(settings);
  }

  async getSettings(userId: string) {
    const settings = await this.settingsRepository.findOne({ where: { user: { id: userId } } });
    if (!settings) {
      return this.createDefaultSettings(userId);
    }
    return settings;
  }

  async updateSettings(userId: string, dto: UpdateUserSettingsDto) {
    const settings = await this.getSettings(userId);
    Object.assign(settings, dto);
    settings.version += 1;
    return this.settingsRepository.save(settings);
  }

  async resetSettings(userId: string) {
    const settings = await this.getSettings(userId);
    this.settingsRepository.merge(settings, {
      preferences: {},
      notificationPrefs: { messages: true, transfers: true, mentions: true },
      privacyPrefs: { showWalletAddress: true, showTransactionHistory: false },
      themePrefs: { darkMode: false, primaryColor: '#4f46e5', fontSize: 16 },
      version: settings.version + 1
    });
    return this.settingsRepository.save(settings);
  }
}