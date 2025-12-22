import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationIdea, OrganizationMember } from '../entities';
import { CreateIdeaDto } from './dto/create-idea.dto';

@Injectable()
export class IdeasService {
  constructor(
    @InjectRepository(OrganizationIdea)
    private readonly ideas: Repository<OrganizationIdea>,
    @InjectRepository(OrganizationMember)
    private readonly members: Repository<OrganizationMember>,
  ) {}

  private async assertMember(userId: string, organizationId: string) {
    const member = await this.members.findOne({
      where: { userId, organizationId },
    });
    if (!member) throw new ForbiddenException('Not a member of this organization');
  }

  async listByOrg(userId: string, organizationId: string) {
    await this.assertMember(userId, organizationId);
    return this.ideas.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      relations: ['user'],
    });
  }

  async create(userId: string, dto: CreateIdeaDto) {
    await this.assertMember(userId, dto.organizationId);
    const idea = this.ideas.create({
      organizationId: dto.organizationId,
      userId,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
    });
    return this.ideas.save(idea);
  }

  async update(ideaId: string, userId: string, dto: Partial<CreateIdeaDto>) {
    const idea = await this.ideas.findOne({ where: { id: ideaId } });
    if (!idea) throw new NotFoundException('Idea not found');
    if (idea.userId !== userId) {
      throw new ForbiddenException('Only the creator can update this idea');
    }

    if (dto.title) idea.title = dto.title.trim();
    if (dto.description !== undefined) idea.description = dto.description?.trim() || null;

    return this.ideas.save(idea);
  }

  async delete(ideaId: string, userId: string) {
    const idea = await this.ideas.findOne({ where: { id: ideaId } });
    if (!idea) throw new NotFoundException('Idea not found');
    if (idea.userId !== userId) {
      throw new ForbiddenException('Only the creator can delete this idea');
    }

    await this.ideas.delete({ id: ideaId });
    return { success: true };
  }
}

