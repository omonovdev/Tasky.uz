import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Organization } from './organization.entity';
import { Profile } from './profile.entity';

@Entity({ name: 'organization_ideas' })
export class OrganizationIdea extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @ManyToOne(() => Organization, (org) => org.ideas)
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @ManyToOne(() => Profile, (u) => u.ideas)
  @JoinColumn({ name: 'user_id' })
  user!: Profile;
}
