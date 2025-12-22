import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Task } from './task.entity';
import { Subgroup } from './subgroup.entity';

@Entity({ name: 'task_subgroup_assignments' })
export class TaskSubgroupAssignment extends BaseEntity {
  @Column({ name: 'task_id', type: 'uuid' })
  taskId!: string;

  @Column({ name: 'subgroup_id', type: 'uuid' })
  subgroupId!: string;

  @ManyToOne(() => Task, (t) => t.subgroupAssignments)
  @JoinColumn({ name: 'task_id' })
  task!: Task;

  @ManyToOne(() => Subgroup, (sg) => sg.taskAssignments)
  @JoinColumn({ name: 'subgroup_id' })
  subgroup!: Subgroup;
}
