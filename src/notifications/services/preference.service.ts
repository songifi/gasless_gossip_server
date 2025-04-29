import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { UpdatePreferenceDto } from '../dto/update-preference.dto';

@Injectable()
export class PreferenceService {
  constructor(
    @InjectRepository(NotificationPreference)
    private preferenceRepo: Repository<NotificationPreference>,
  ) {}

  async getUserPreferences(userId: string, notificationType: string): Promise<NotificationPreference[]> {
    return this.preferenceRepo.find({
      where: { user: { id: userId }, notificationType, enabled: true },
      relations: ['channel'],
    });
  }

  async updatePreference(userId: string, dto: UpdatePreferenceDto): Promise<void> {
    const preference = await this.preferenceRepo.findOne({
      where: { user: { id: userId }, notificationType: dto.notificationType, channel: { id: dto.channelId } },
    });

    if (preference) {
      preference.enabled = dto.enabled;
      await this.preferenceRepo.save(preference);
    } else {
      const newPreference = this.preferenceRepo.create({
        user: { id: userId },
        notificationType: dto.notificationType,
        channel: { id: dto.channelId },
        enabled: dto.enabled,
      });
      await this.preferenceRepo.save(newPreference);
    }
  }
}