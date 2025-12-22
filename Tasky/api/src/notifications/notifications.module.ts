import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationRead } from '../entities';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationRead])],
  providers: [NotificationsService, NotificationsGateway],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule { }
