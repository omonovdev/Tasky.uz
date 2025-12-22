import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { TaskReport } from './task-report.entity';

@Entity({ name: 'task_attachments' })
export class TaskAttachment extends BaseEntity {
  @Column({ name: 'task_report_id', type: 'uuid' })
  taskReportId!: string;

  @Column({ name: 'file_url' })
  fileUrl!: string;

  @Column({ name: 'file_name' })
  fileName!: string;

  @Column({ name: 'file_type' })
  fileType!: string;

  @Column({ name: 'file_size', type: 'int', nullable: true })
  fileSize?: number | null;

  @ManyToOne(() => TaskReport, (r) => r.attachments)
  @JoinColumn({ name: 'task_report_id' })
  report!: TaskReport;
}
