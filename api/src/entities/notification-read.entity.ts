import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Profile } from './profile.entity';

@Entity({ name: 'notification_reads' })
export class NotificationRead extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'notification_type' })
  notificationType!: string; // invitation | task | task_completed

  @Column({ name: 'notification_id' })
  notificationId!: string;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt?: Date | null;

  @ManyToOne(() => Profile, (u) => u.notificationReads)
  @JoinColumn({ name: 'user_id' })
  user!: Profile;
}
