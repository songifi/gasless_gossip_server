import { Controller, Get, Patch, Put, Query, Param, Body, UseGuards, Req } from '@nestjs/common';
import { NotificationService } from '../services/notification.service';
import { PreferenceService } from '../services/preference.service';
import { FilterNotificationsDto } from '../dto/filter-notifications.dto';
import { UpdatePreferenceDto } from '../dto/update-preference.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private notificationService: NotificationService,
    private preferenceService: PreferenceService,
  ) {}

  @Get()
  async getNotifications(@Req() req, @Query() filter: FilterNotificationsDto) {
    return this.notificationService.getUserNotifications(req.user.id, filter);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req) {
    await this.notificationService.markAsRead(id, req.user.id);
    return { message: 'Notification marked as read' };
  }

  @Put('preferences')
  async updatePreference(@Req() req, @Body() dto: UpdatePreferenceDto) {
    await this.preferenceService.updatePreference(req.user.id, dto);
    return { message: 'Preference updated' };
  }
}