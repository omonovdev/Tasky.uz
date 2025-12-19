import { Column, Entity, ManyToOne, OneToMany, Index, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Organization } from './organization.entity';
import { Profile } from './profile.entity';
import { TaskAssignment } from './task-assignment.entity';
import { TaskStage } from './task-stage.entity';
import { TaskReport } from './task-report.entity';
import { TaskSubgroupAssignment } from './task-subgroup-assignment.entity';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

@Entity({ name: 'tasks' })
@Index('idx_task_organization', ['organizationId'])
@Index('idx_task_assigned_to', ['assignedToId'])
@Index('idx_task_status', ['status'])
@Index('idx_task_deadline', ['deadline'])
@Index('idx_task_org_status', ['organizationId', 'status'])
export class Task extends BaseEntity {
  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'text', nullable: true })
  goal?: string | null;

  @Column({ name: 'custom_goal', type: 'text', nullable: true })
  customGoal?: string | null;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null;

  @Column({ name: 'assigned_by', type: 'uuid' })
  assignedById!: string;

  @Column({ name: 'assigned_to', type: 'uuid' })
  assignedToId!: string;

  @Column({ type: 'timestamp' })
  deadline!: Date;

  @Column({ name: 'status', default: 'pending' })
  status!: TaskStatus;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt?: Date | null;

  @Column({ name: 'actual_completed_at', type: 'timestamp', nullable: true })
  actualCompletedAt?: Date | null;

  @Column({ name: 'last_edited_at', type: 'timestamp', nullable: true })
  lastEditedAt?: Date | null;

  @Column({ name: 'last_edited_by', type: 'uuid', nullable: true })
  lastEditedBy?: string | null;

  @Column({ name: 'estimated_completion_hours', type: 'int', nullable: true })
  estimatedCompletionHours?: number | null;

  @Column({ name: 'decline_reason', type: 'text', nullable: true })
  declineReason?: string | null;

  @ManyToOne(() => Organization, (org) => org.tasks, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization | null;

  @ManyToOne(() => Profile, (p) => p.assignedTasks)
  @JoinColumn({ name: 'assigned_to' })
  assignedTo!: Profile;

  @ManyToOne(() => Profile, { nullable: true })
  @JoinColumn({ name: 'assigned_by' })
  assignedBy?: Profile;

  @OneToMany(() => TaskAssignment, (ta) => ta.task)
  assignments?: TaskAssignment[];

  @OneToMany(() => TaskStage, (ts) => ts.task)
  stages?: TaskStage[];

  @OneToMany(() => TaskReport, (tr) => tr.task)
  reports?: TaskReport[];

  @OneToMany(() => TaskSubgroupAssignment, (tsa) => tsa.task)
  subgroupAssignments?: TaskSubgroupAssignment[];
}
