import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { StatusService } from './status.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateStatusDto } from './dto/status-update.dto';
import { User } from '../decorators/user.decorator';

@Controller('status')
@UseGuards(JwtAuthGuard)
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Post(':messageId')
  async updateStatus(
    @Param('messageId') messageId: string,
    @Body() updateStatusDto: UpdateStatusDto,
    @User() user: any,
  ): Promise<{ success: boolean }> {
    await this.statusService.updateMessageStatus(
      messageId,
      user.id,
      updateStatusDto.status,
    );
    
    return { success: true };
  }
}
