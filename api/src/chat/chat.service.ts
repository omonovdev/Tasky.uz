import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  OrganizationChat,
  OrganizationChatReaction,
  OrganizationChatAttachment,
  Profile,
} from '../entities';
import { CreateMessageDto } from './create-message.dto';
import { ReactMessageDto } from './react-message.dto';
import { UpdateMessageDto } from './update-message.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(OrganizationChat)
    private readonly messages: Repository<OrganizationChat>,
    @InjectRepository(OrganizationChatReaction)
    private readonly reactions: Repository<OrganizationChatReaction>,
    @InjectRepository(OrganizationChatAttachment)
    private readonly attachments: Repository<OrganizationChatAttachment>,
    @InjectRepository(Profile) private readonly profiles: Repository<Profile>,
  ) {}

  async listByOrg(organizationId: string, limit = 100) {
    const rows = await this.messages.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['user', 'reactions', 'attachments'],
    });
    return rows.reverse();
  }

  async createMessage(userId: string, dto: CreateMessageDto) {
    const message = this.messages.create({
      organizationId: dto.organizationId,
      userId,
      message: dto.message,
      replyToId: dto.replyToId ?? null,
    });
    const saved = await this.messages.save(message);
    if (dto.attachments?.length) {
      const rows = dto.attachments.map((a) =>
        this.attachments.create({
          messageId: saved.id,
          fileUrl: a.fileUrl,
          fileName: a.fileName,
          fileType: a.fileType,
          fileSize: a.fileSize,
        }),
      );
      await this.attachments.save(rows);
    }
    return this.findOne(saved.id);
  }

  async react(userId: string, dto: ReactMessageDto) {
    const message = await this.messages.findOne({
      where: { id: dto.messageId },
    });
    if (!message) throw new NotFoundException('Message not found');
    const existing = await this.reactions.findOne({
      where: { messageId: dto.messageId, userId },
    });
    if (existing) {
      existing.reaction = dto.reaction;
      await this.reactions.save(existing);
    } else {
      await this.reactions.save(
        this.reactions.create({
          messageId: dto.messageId,
          userId,
          reaction: dto.reaction,
        }),
      );
    }
    return this.findOne(dto.messageId);
  }

  async findOne(id: string) {
    const msg = await this.messages.findOne({
      where: { id },
      relations: ['user', 'reactions', 'attachments'],
    });
    if (!msg) throw new NotFoundException('Message not found');
    return msg;
  }

  async editMessage(userId: string, messageId: string, dto: UpdateMessageDto) {
    const msg = await this.messages.findOne({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('Message not found');
    if (msg.userId !== userId) throw new ForbiddenException('Not allowed');
    msg.message = dto.message;
    msg.editedAt = new Date();
    await this.messages.save(msg);
    return this.findOne(messageId);
  }

  async deleteMessage(id: string) {
    const msg = await this.messages.findOne({ where: { id } });
    if (!msg) throw new NotFoundException('Message not found');
    msg.isDeleted = true;
    await this.messages.save(msg);
    return this.findOne(id);
  }
}
