import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Task } from './task.entity';
import { Profile } from './profile.entity';

@Entity({ name: 'task_assignments' })
export class TaskAssignment extends BaseEntity {
  @Column({ name: 'task_id', type: 'uuid' })
  taskId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => Task, (task) => task.assignments)
  @JoinColumn({ name: 'task_id' })
  task!: Task;

  @ManyToOne(() => Profile, (user) => user.taskAssignments)
  @JoinColumn({ name: 'user_id' })
  user!: Profile;
}
