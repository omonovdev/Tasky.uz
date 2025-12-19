import { Column, Entity, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Task } from './task.entity';
import { Profile } from './profile.entity';
import { TaskAttachment } from './task-attachment.entity';

@Entity({ name: 'task_reports' })
export class TaskReport extends BaseEntity {
  @Column({ name: 'task_id', type: 'uuid' })
  taskId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'report_text', type: 'text' })
  reportText!: string;

  @ManyToOne(() => Task, (t) => t.reports)
  @JoinColumn({ name: 'task_id' })
  task!: Task;

  @ManyToOne(() => Profile, (u) => u.reports)
  @JoinColumn({ name: 'user_id' })
  user!: Profile;

  @OneToMany(() => TaskAttachment, (a) => a.report)
  attachments?: TaskAttachment[];
}
