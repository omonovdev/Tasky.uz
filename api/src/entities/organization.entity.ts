import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { OrganizationMember } from './organization-member.entity';
import { OrganizationInvitation } from './organization-invitation.entity';
import { Subgroup } from './subgroup.entity';
import { Task } from './task.entity';
import { OrganizationChat } from './organization-chat.entity';
import { OrganizationIdea } from './organization-idea.entity';
import { Profile } from './profile.entity';

@Entity({ name: 'organizations' })
export class Organization extends BaseEntity {
  @Column()
  name!: string;

  @Column({ name: 'subheadline', type: 'text', nullable: true })
  subheadline?: string | null;

  @Column({ nullable: true, type: 'text' })
  description?: string | null;

  @Column({ name: 'motto', type: 'text', nullable: true })
  motto?: string | null;

  @Column({ name: 'photo_url', type: 'text', nullable: true })
  photoUrl?: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  @Column({ name: 'agreement_text', type: 'text', nullable: true })
  agreementText?: string | null;

  @Column({ name: 'agreement_version', type: 'int', nullable: true })
  agreementVersion?: number | null;

  @OneToMany(() => OrganizationMember, (m) => m.organization)
  members?: OrganizationMember[];

  @OneToMany(() => OrganizationInvitation, (i) => i.organization)
  invitations?: OrganizationInvitation[];

  @OneToMany(() => Subgroup, (s) => s.organization)
  subgroups?: Subgroup[];

  @OneToMany(() => Task, (t) => t.organization)
  tasks?: Task[];

  @OneToMany(() => OrganizationChat, (c) => c.organization)
  chats?: OrganizationChat[];

  @OneToMany(() => OrganizationIdea, (i) => i.organization)
  ideas?: OrganizationIdea[];

  @OneToMany(() => Profile, (p) => p.organizationEntity)
  profiles?: Profile[];
}
