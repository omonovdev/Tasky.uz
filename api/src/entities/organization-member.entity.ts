import { Column, Entity, ManyToOne, Index, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Organization } from './organization.entity';
import { Profile } from './profile.entity';

@Entity({ name: 'organization_members' })
@Index('idx_org_member_user', ['userId'])
@Index('idx_org_member_org', ['organizationId'])
@Index('idx_org_member_unique', ['organizationId', 'userId'], { unique: true })
export class OrganizationMember extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  // Explicit type to avoid reflect-metadata resolving union to Object
  @Column({ name: 'position', type: 'text', nullable: true })
  position?: string | null;

  // Explicit type to avoid reflect-metadata resolving union to Object
  @Column({ name: 'added_by', type: 'text', nullable: true })
  addedBy?: string | null;

  @Column({ name: 'agreement_accepted_at', type: 'timestamp', nullable: true })
  agreementAcceptedAt?: Date | null;

  @Column({ name: 'agreement_version_accepted', type: 'int', nullable: true })
  agreementVersionAccepted?: number | null;

  @ManyToOne(() => Organization, (org) => org.members)
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @ManyToOne(() => Profile, (user) => user.memberships)
  @JoinColumn({ name: 'user_id' })
  user!: Profile;
}
