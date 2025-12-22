import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Organization } from './organization.entity';
import { Profile } from './profile.entity';

export type InvitationStatus = 'pending' | 'accepted' | 'declined';

@Entity({ name: 'organization_invitations' })
export class OrganizationInvitation extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId!: string;

  @Column({ default: 'pending' })
  status!: InvitationStatus;

  @Column({ name: 'invitation_message', type: 'text', nullable: true })
  invitationMessage?: string | null;

  // Explicit type for Postgres
  @Column({ name: 'contract_duration', type: 'text', nullable: true })
  contractDuration?: string | null;

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt?: Date | null;

  @Column({ name: 'declined_at', type: 'timestamp', nullable: true })
  declinedAt?: Date | null;

  @ManyToOne(() => Organization, (org) => org.invitations)
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @ManyToOne(() => Profile, { nullable: true })
  @JoinColumn({ name: 'employee_id' })
  employee?: Profile | null;
}
