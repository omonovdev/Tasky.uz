import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationRead } from '../entities';
import { MarkReadDto } from './mark-read.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationRead)
    private readonly reads: Repository<NotificationRead>,
  ) {}

  async listForUser(userId: string) {
    return this.reads.find({ where: { userId }, order: { readAt: 'DESC' } });
  }

  async markRead(userId: string, dto: MarkReadDto) {
    const existing = await this.reads.findOne({
      where: {
        userId,
        notificationId: dto.notificationId,
        notificationType: dto.notificationType,
      },
    });
    const readAt = new Date();
    if (existing) {
      existing.readAt = readAt;
      return this.reads.save(existing);
    }
    const row = this.reads.create({
      userId,
      notificationId: dto.notificationId,
      notificationType: dto.notificationType,
      readAt,
    });
    return this.reads.save(row);
  }
}
