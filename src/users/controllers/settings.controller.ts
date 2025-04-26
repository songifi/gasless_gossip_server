import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateUserSettingsDto } from '../dto/update-user-settings.dto';
import { SettingsService } from '../services/settings.service';

@Controller('users/:userId/settings')
@UseGuards(AuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings(@CurrentUser() user: { id: string }) {
    return this.settingsService.getSettings(user.id);
  }

  @Put()
  async updateSettings(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateUserSettingsDto
  ) {
    return this.settingsService.updateSettings(user.id, dto);
  }

  @Post('reset')
  async resetSettings(@CurrentUser() user: { id: string }) {
    return this.settingsService.resetSettings(user.id);
  }
}