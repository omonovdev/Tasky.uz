import { Column, Entity, ManyToOne, OneToMany, Index, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Organization } from './organization.entity';
import { OrganizationMember } from './organization-member.entity';
import { UserRole } from './user-role.entity';
import { Task } from './task.entity';
import { TaskAssignment } from './task-assignment.entity';
import { UserGoal } from './user-goal.entity';
import { NotificationRead } from './notification-read.entity';
import { OrganizationChat } from './organization-chat.entity';
import { OrganizationIdea } from './organization-idea.entity';
import { TaskReport } from './task-report.entity';

@Entity({ name: 'profiles' })
@Index('idx_profile_email', ['email'], { unique: true, where: 'email IS NOT NULL' })
@Index('idx_profile_organization', ['organizationId'])
export class Profile extends BaseEntity {
  @Column({ name: 'first_name' })
  firstName!: string;

  @Column({ name: 'last_name' })
  lastName!: string;

  @Column({ type: 'text', nullable: true })
  email?: string | null;

  @Column({ name: 'password_hash', type: 'text', nullable: true, select: false })
  passwordHash?: string | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth?: string | null;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl?: string | null;

  @Column({ type: 'text', nullable: true })
  organization?: string | null;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null;

  @Column({ type: 'text', nullable: true })
  position?: string | null;

  @ManyToOne(() => Organization, (org) => org.profiles, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organizationEntity?: Organization | null;

  @OneToMany(() => OrganizationMember, (m) => m.user)
  memberships?: OrganizationMember[];

  @OneToMany(() => UserRole, (r) => r.user)
  roles?: UserRole[];

  @OneToMany(() => Task, (t) => t.assignedTo)
  assignedTasks?: Task[];

  @OneToMany(() => TaskAssignment, (ta) => ta.user)
  taskAssignments?: TaskAssignment[];

  @OneToMany(() => UserGoal, (g) => g.user)
  goals?: UserGoal[];

  @OneToMany(() => NotificationRead, (n) => n.user)
  notificationReads?: NotificationRead[];

  @OneToMany(() => OrganizationChat, (c) => c.user)
  chats?: OrganizationChat[];

  @OneToMany(() => OrganizationIdea, (i) => i.user)
  ideas?: OrganizationIdea[];

  @OneToMany(() => TaskReport, (r) => r.user)
  reports?: TaskReport[];
}
