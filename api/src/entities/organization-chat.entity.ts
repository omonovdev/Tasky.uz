import { Column, Entity, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Organization } from './organization.entity';
import { Profile } from './profile.entity';
import { OrganizationChatReaction } from './organization-chat-reaction.entity';
import { OrganizationChatAttachment } from './organization-chat-attachment.entity';

@Entity({ name: 'organization_chat' })
export class OrganizationChat extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ name: 'edited_at', type: 'timestamp', nullable: true })
  editedAt?: Date | null;

  @Column({ name: 'reply_to', type: 'uuid', nullable: true })
  replyToId?: string | null;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted?: boolean;

  @ManyToOne(() => Organization, (org) => org.chats)
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @ManyToOne(() => Profile, (user) => user.chats)
  @JoinColumn({ name: 'user_id' })
  user!: Profile;

  @OneToMany(() => OrganizationChatReaction, (r) => r.message)
  reactions?: OrganizationChatReaction[];

  @ManyToOne(() => OrganizationChat, (msg) => msg.replies, { nullable: true })
  @JoinColumn({ name: 'reply_to' })
  replyTo?: OrganizationChat | null;

  @OneToMany(() => OrganizationChat, (msg) => msg.replyTo)
  replies?: OrganizationChat[];

  @OneToMany(() => OrganizationChatAttachment, (a) => a.message)
  attachments?: OrganizationChatAttachment[];
}
