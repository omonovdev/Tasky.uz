import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Task } from './task.entity';

@Entity({ name: 'task_stages' })
export class TaskStage extends BaseEntity {
  @Column({ name: 'task_id', type: 'uuid' })
  taskId!: string;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'order_index', type: 'int' })
  orderIndex!: number;

  @Column({ name: 'status', type: 'text', nullable: true })
  status?: string | null;

  @ManyToOne(() => Task, (task) => task.stages)
  @JoinColumn({ name: 'task_id' })
  task!: Task;
}
