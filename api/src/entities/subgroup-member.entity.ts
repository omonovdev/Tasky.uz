import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Subgroup } from './subgroup.entity';
import { Profile } from './profile.entity';

@Entity({ name: 'subgroup_members' })
export class SubgroupMember extends BaseEntity {
  @Column({ name: 'subgroup_id', type: 'uuid' })
  subgroupId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => Subgroup, (sg) => sg.members)
  @JoinColumn({ name: 'subgroup_id' })
  subgroup!: Subgroup;

  @ManyToOne(() => Profile, (p) => p.taskAssignments)
  @JoinColumn({ name: 'user_id' })
  user!: Profile;
}
