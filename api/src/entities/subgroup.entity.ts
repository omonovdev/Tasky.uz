import { Column, Entity, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Organization } from './organization.entity';
import { SubgroupMember } from './subgroup-member.entity';
import { TaskSubgroupAssignment } from './task-subgroup-assignment.entity';

@Entity({ name: 'subgroups' })
export class Subgroup extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @ManyToOne(() => Organization, (org) => org.subgroups)
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @OneToMany(() => SubgroupMember, (m) => m.subgroup)
  members?: SubgroupMember[];

  @OneToMany(() => TaskSubgroupAssignment, (tsa) => tsa.subgroup)
  taskAssignments?: TaskSubgroupAssignment[];
}
