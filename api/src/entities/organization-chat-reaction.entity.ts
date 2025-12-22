import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { OrganizationChat } from './organization-chat.entity';
import { Profile } from './profile.entity';

@Entity({ name: 'organization_chat_reactions' })
export class OrganizationChatReaction extends BaseEntity {
  @Column({ name: 'message_id', type: 'uuid' })
  messageId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column()
  reaction!: string;

  @ManyToOne(() => OrganizationChat, (msg) => msg.reactions)
  @JoinColumn({ name: 'message_id' })
  message!: OrganizationChat;

  @ManyToOne(() => Profile, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: Profile;
}
