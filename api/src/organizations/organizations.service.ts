import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Organization,
  OrganizationInvitation,
  OrganizationMember,
  OrganizationChat,
  OrganizationChatAttachment,
  OrganizationChatReaction,
  OrganizationIdea,
  Profile,
  Subgroup,
  SubgroupMember,
  Task,
  TaskAssignment,
  TaskAttachment,
  TaskReport,
  TaskStage,
  TaskSubgroupAssignment,
} from '../entities';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteDto } from './dto/invite.dto';
import { AcceptAgreementDto } from './dto/accept-agreement.dto';
import { UpdateMemberPositionDto } from './dto/update-member-position.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgs: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private readonly members: Repository<OrganizationMember>,
    @InjectRepository(OrganizationInvitation)
    private readonly invites: Repository<OrganizationInvitation>,
    @InjectRepository(OrganizationIdea)
    private readonly ideas: Repository<OrganizationIdea>,
    @InjectRepository(OrganizationChat)
    private readonly chats: Repository<OrganizationChat>,
    @InjectRepository(OrganizationChatReaction)
    private readonly chatReactions: Repository<OrganizationChatReaction>,
    @InjectRepository(OrganizationChatAttachment)
    private readonly chatAttachments: Repository<OrganizationChatAttachment>,
    @InjectRepository(Subgroup)
    private readonly subgroups: Repository<Subgroup>,
    @InjectRepository(SubgroupMember)
    private readonly subgroupMembers: Repository<SubgroupMember>,
    @InjectRepository(Task)
    private readonly tasks: Repository<Task>,
    @InjectRepository(TaskAssignment)
    private readonly taskAssignments: Repository<TaskAssignment>,
    @InjectRepository(TaskStage)
    private readonly taskStages: Repository<TaskStage>,
    @InjectRepository(TaskReport)
    private readonly taskReports: Repository<TaskReport>,
    @InjectRepository(TaskAttachment)
    private readonly taskAttachments: Repository<TaskAttachment>,
    @InjectRepository(TaskSubgroupAssignment)
    private readonly taskSubgroupAssignments: Repository<TaskSubgroupAssignment>,
    @InjectRepository(Profile)
    private readonly profiles: Repository<Profile>,
  ) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    const org = this.orgs.create({
      name: dto.name.trim(),
      subheadline: dto.subheadline?.trim(),
      description: dto.description?.trim(),
      motto: dto.motto?.trim(),
      photoUrl: dto.photoUrl ?? null,
      agreementText: dto.agreementText,
      agreementVersion: dto.agreementText ? 1 : null,
      createdBy: userId,
    });
    const saved = await this.orgs.save(org);
    const member = this.members.create({
      organizationId: saved.id,
      userId,
      position: 'CEO',
      addedBy: userId,
      agreementAcceptedAt: new Date(),
      agreementVersionAccepted: saved.agreementVersion,
    });
    await this.members.save(member);
    return saved;
  }

  async listForUser(userId: string) {
    const memberships = await this.members.find({
      where: { userId },
      relations: ['organization'],
    });
    return memberships.map((m) => m.organization);
  }

  async membershipsForUser(userId: string) {
    return this.members.find({
      where: { userId },
      relations: ['organization'],
      order: { createdAt: 'DESC' },
    });
  }

  async search(q: string) {
    const query = (q || '').trim();
    if (!query) return [];
    return this.orgs
      .createQueryBuilder('o')
      .where('o.name ILIKE :q OR o.description ILIKE :q', { q: `%${query}%` })
      .orderBy('o.createdAt', 'DESC')
      .limit(20)
      .getMany();
  }

  async getOrg(orgId: string) {
    const org = await this.orgs.findOne({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(orgId: string, userId: string, dto: UpdateOrganizationDto) {
    const org = await this.getOrg(orgId);
    if (org.createdBy !== userId)
      throw new ForbiddenException('Only creator can update organization');

    org.name = dto.name ?? org.name;
    org.subheadline = dto.subheadline ?? org.subheadline;
    org.description = dto.description ?? org.description;
    org.motto = dto.motto ?? org.motto;
    if ((dto as any).photoUrl !== undefined) {
      org.photoUrl = (dto as any).photoUrl;
    }

    if (dto.agreementText !== undefined) {
      const nextText = dto.agreementText;
      if (nextText && nextText !== org.agreementText) {
        org.agreementVersion = (org.agreementVersion || 0) + 1;
      }
      org.agreementText = nextText ?? null;
    }

    return this.orgs.save(org);
  }

  async membersOf(orgId: string) {
    return this.members.find({
      where: { organizationId: orgId },
      relations: ['user'],
    });
  }

  async listInvitationsForEmployee(employeeId: string, status?: string) {
    const where: any = { employeeId };
    if (status) where.status = status;
    return this.invites.find({
      where,
      order: { createdAt: 'DESC' },
      relations: ['organization'],
    });
  }

  async listInvitationsForOrg(orgId: string, userId: string) {
    const org = await this.getOrg(orgId);
    if (org.createdBy !== userId)
      throw new ForbiddenException('Only creator can view invitations');
    return this.invites.find({
      where: { organizationId: orgId },
      order: { createdAt: 'DESC' },
      relations: ['employee'],
    });
  }

  async invite(orgId: string, inviterId: string, dto: InviteDto) {
    const org = await this.getOrg(orgId);
    if (org.createdBy !== inviterId)
      throw new ForbiddenException('Only creator can invite');

    const existing = await this.invites.findOne({
      where: { organizationId: orgId, employeeId: dto.employeeId },
    });
    if (existing) {
      existing.status = 'pending';
      existing.invitationMessage = dto.invitationMessage ?? null;
      existing.contractDuration = dto.contractDuration ?? null;
      existing.acceptedAt = null;
      existing.declinedAt = null;
      return this.invites.save(existing);
    }

    const invite = this.invites.create({
      organizationId: orgId,
      employeeId: dto.employeeId,
      invitationMessage: dto.invitationMessage ?? null,
      contractDuration: dto.contractDuration ?? null,
      status: 'pending',
    });
    return this.invites.save(invite);
  }

  async acceptInvitation(userId: string, invitationId: string) {
    const inv = await this.invites.findOne({
      where: { id: invitationId, employeeId: userId },
    });
    if (!inv || inv.status !== 'pending')
      throw new NotFoundException('Invitation not found');

    inv.status = 'accepted';
    inv.acceptedAt = new Date();
    await this.invites.save(inv);

    const org = await this.getOrg(inv.organizationId);

    const member = this.members.create({
      organizationId: inv.organizationId,
      userId,
      position: inv.contractDuration ?? 'Member',
      addedBy: userId,
      agreementAcceptedAt: new Date(),
      agreementVersionAccepted: org.agreementVersion ?? null,
    });
    await this.members.save(member);
    return { success: true };
  }

  async declineInvitation(userId: string, invitationId: string) {
    const inv = await this.invites.findOne({
      where: { id: invitationId, employeeId: userId },
    });
    if (!inv || inv.status !== 'pending')
      throw new NotFoundException('Invitation not found');
    inv.status = 'declined';
    inv.declinedAt = new Date();
    await this.invites.save(inv);
    return { success: true };
  }

  async acceptAgreement(userId: string, orgId: string, dto: AcceptAgreementDto) {
    const member = await this.members.findOne({
      where: { organizationId: orgId, userId },
    });
    if (!member) throw new NotFoundException('Membership not found');

    const org = await this.getOrg(orgId);
    member.agreementAcceptedAt = new Date();
    member.agreementVersionAccepted =
      dto.agreementVersion ?? org.agreementVersion ?? member.agreementVersionAccepted ?? null;
    await this.members.save(member);
    return { success: true };
  }

  async updateMemberPosition(
    memberId: string,
    userId: string,
    dto: UpdateMemberPositionDto,
  ) {
    const member = await this.members.findOne({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Member not found');

    const org = await this.getOrg(member.organizationId);
    if (org.createdBy !== userId)
      throw new ForbiddenException('Only creator can update members');

    member.position = dto.position;
    return this.members.save(member);
  }

  async removeMember(memberId: string, userId: string) {
    const member = await this.members.findOne({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Member not found');

    const org = await this.getOrg(member.organizationId);
    if (org.createdBy !== userId)
      throw new ForbiddenException('Only creator can remove members');

    if (member.userId === org.createdBy) {
      throw new ForbiddenException('Cannot remove the organization creator');
    }

    await this.members.delete({ id: memberId });
    return { success: true };
  }

  async delete(orgId: string, userId: string) {
    const org = await this.getOrg(orgId);
    if (org.createdBy !== userId)
      throw new ForbiddenException('Only creator can delete organization');

    await this.invites.delete({ organizationId: orgId });
    await this.members.delete({ organizationId: orgId });
    await this.ideas.delete({ organizationId: orgId });

    const chatRows = await this.chats.find({
      where: { organizationId: orgId },
      select: ['id'],
    });
    const chatIds = chatRows.map((c) => c.id);
    if (chatIds.length) {
      await this.chatReactions
        .createQueryBuilder()
        .delete()
        .where('message_id IN (:...ids)', { ids: chatIds })
        .execute();
      await this.chatAttachments
        .createQueryBuilder()
        .delete()
        .where('message_id IN (:...ids)', { ids: chatIds })
        .execute();
    }
    await this.chats.delete({ organizationId: orgId });

    const subgroupRows = await this.subgroups.find({
      where: { organizationId: orgId },
      select: ['id'],
    });
    const subgroupIds = subgroupRows.map((s) => s.id);
    if (subgroupIds.length) {
      await this.subgroupMembers
        .createQueryBuilder()
        .delete()
        .where('subgroup_id IN (:...ids)', { ids: subgroupIds })
        .execute();
      await this.subgroups.delete({ organizationId: orgId });
    }

    const taskRows = await this.tasks.find({
      where: { organizationId: orgId },
      select: ['id'],
    });
    const taskIds = taskRows.map((t) => t.id);
    if (taskIds.length) {
      await this.taskAssignments
        .createQueryBuilder()
        .delete()
        .where('task_id IN (:...ids)', { ids: taskIds })
        .execute();

      await this.taskStages
        .createQueryBuilder()
        .delete()
        .where('task_id IN (:...ids)', { ids: taskIds })
        .execute();

      const reports = await this.taskReports
        .createQueryBuilder('r')
        .select(['r.id'])
        .where('r.taskId IN (:...ids)', { ids: taskIds })
        .getMany();
      const reportIds = reports.map((r) => r.id);
      if (reportIds.length) {
        await this.taskAttachments
          .createQueryBuilder()
          .delete()
          .where('task_report_id IN (:...ids)', { ids: reportIds })
          .execute();
      }

      await this.taskReports
        .createQueryBuilder()
        .delete()
        .where('task_id IN (:...ids)', { ids: taskIds })
        .execute();

      await this.taskSubgroupAssignments
        .createQueryBuilder()
        .delete()
        .where('task_id IN (:...ids)', { ids: taskIds })
        .execute();

      await this.tasks
        .createQueryBuilder()
        .delete()
        .where('organization_id = :orgId', { orgId })
        .execute();
    }

    await this.orgs.delete({ id: orgId });
    return { success: true };
  }
}
