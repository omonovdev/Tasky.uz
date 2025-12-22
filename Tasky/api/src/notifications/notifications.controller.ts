import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { MarkReadDto } from './mark-read.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('reads')
  async reads(@CurrentUser() user: any) {
    return this.notifications.listForUser(user.userId);
  }

  @Post('reads')
  async markRead(@CurrentUser() user: any, @Body() dto: MarkReadDto) {
    return this.notifications.markRead(user.userId, dto);
  }
}
