import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { NotificationService, NotificationJob } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  async sendNotification(@Body() notificationData: NotificationJob) {
    return this.notificationService.sendNotification(notificationData);
  }

  @Post('bulk')
  async bulkSendNotification(
    @Body() data: { userIds: string[], notification: Omit<NotificationJob, 'userId'> }
  ) {
    return this.notificationService.bulkSendNotification(data.userIds, data.notification);
  }

  @Get(':id')
  async getNotificationStatus(@Param('id') id: string) {
    return this.notificationService.getNotificationStatus(id);
  }
}
