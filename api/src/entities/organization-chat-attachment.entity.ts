import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { OrganizationChat } from './organization-chat.entity';

@Entity({ name: 'organization_chat_attachments' })
export class OrganizationChatAttachment extends BaseEntity {
  @Column({ name: 'message_id', type: 'uuid' })
  messageId!: string;

  @Column({ name: 'file_url' })
  fileUrl!: string;

  @Column({ name: 'file_name' })
  fileName!: string;

  @Column({ name: 'file_type' })
  fileType!: string;

  @Column({ name: 'file_size', type: 'int', nullable: true })
  fileSize?: number | null;

  @ManyToOne(() => OrganizationChat, (msg) => msg.attachments)
  @JoinColumn({ name: 'message_id' })
  message!: OrganizationChat;
}
