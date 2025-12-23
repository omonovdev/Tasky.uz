import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { UsersGateway } from './users.gateway';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationRead,
  Organization,
  OrganizationChat,
  OrganizationChatAttachment,
  OrganizationChatReaction,
  OrganizationChatTyping,
  OrganizationIdea,
  OrganizationInvitation,
  OrganizationMember,
  PasswordResetToken,
  Profile,
  Subgroup,
  SubgroupMember,
  Task,
  TaskAssignment,
  TaskAttachment,
  TaskReport,
  TaskStage,
  TaskSubgroupAssignment,
  UserGoal,
  UserRole,
} from '../entities';
import { UpdateProfileDto } from './update-profile.dto';
import { SetRoleDto } from './set-role.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Profile)
    private readonly profiles: Repository<Profile>,
    @InjectRepository(UserRole)
    private readonly roles: Repository<UserRole>,
    private readonly usersGateway: UsersGateway,
  ) { }

  async getById(id: string) {
    const user = await this.profiles.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const user = await this.getById(id);
    Object.assign(user, {
      firstName: dto.firstName ?? user.firstName,
      lastName: dto.lastName ?? user.lastName,
      dateOfBirth: dto.dateOfBirth ?? user.dateOfBirth,
      position: dto.position ?? user.position,
      organization: dto.organization ?? user.organization,
    });
    if ((dto as any).avatarUrl !== undefined) {
      (user as any).avatarUrl = (dto as any).avatarUrl;
    }
    const saved = await this.profiles.save(user);
    // Real-time event: profil yangilandi
    this.usersGateway.emitProfileUpdated(id, saved);
    return saved;
  }

  async setRole(userId: string, dto: SetRoleDto) {
    let role = await this.roles.findOne({ where: { userId } });
    if (role) {
      role.role = dto.role;
      return this.roles.save(role);
    }
    role = this.roles.create({ userId, role: dto.role });
    return this.roles.save(role);
  }

  async getRole(userId: string) {
    const role = await this.roles.findOne({ where: { userId } });
    return { role: role?.role || 'employee' };
  }

  async search(q: string, exclude?: string) {
    const query = (q || '').trim();
    if (!query) return [];

    const qb = this.profiles
      .createQueryBuilder('p')
      .where(
        '(p.firstName ILIKE :q OR p.lastName ILIKE :q OR p.email ILIKE :q)',
        { q: `%${query}%` },
      )
      .orderBy('p.createdAt', 'DESC')
      .limit(20);

    if (exclude?.trim()) {
      qb.andWhere('p.id != :exclude', { exclude: exclude.trim() });
    }

    return qb.getMany();
  }

  async deleteAccount(userId: string) {
    const result = await this.profiles.manager.transaction(async (manager) => {
      const profiles = manager.getRepository(Profile);
      const roles = manager.getRepository(UserRole);
      const resetTokens = manager.getRepository(PasswordResetToken);
      const goals = manager.getRepository(UserGoal);
      const notificationReads = manager.getRepository(NotificationRead);

      const organizations = manager.getRepository(Organization);
      const organizationMembers = manager.getRepository(OrganizationMember);
      const organizationInvitations = manager.getRepository(OrganizationInvitation);
      const organizationIdeas = manager.getRepository(OrganizationIdea);
      const chats = manager.getRepository(OrganizationChat);
      const chatReactions = manager.getRepository(OrganizationChatReaction);
      const chatAttachments = manager.getRepository(OrganizationChatAttachment);
      const chatTyping = manager.getRepository(OrganizationChatTyping);

      const subgroups = manager.getRepository(Subgroup);
      const subgroupMembers = manager.getRepository(SubgroupMember);

      const tasks = manager.getRepository(Task);
      const taskAssignments = manager.getRepository(TaskAssignment);
      const taskStages = manager.getRepository(TaskStage);
      const taskReports = manager.getRepository(TaskReport);
      const taskAttachments = manager.getRepository(TaskAttachment);
      const taskSubgroupAssignments = manager.getRepository(TaskSubgroupAssignment);

      const user = await profiles.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      const deleteTasksByIds = async (taskIds: string[]) => {
        if (!taskIds.length) return;

        await taskAssignments
          .createQueryBuilder()
          .delete()
          .where('task_id IN (:...ids)', { ids: taskIds })
          .execute();

        await taskStages
          .createQueryBuilder()
          .delete()
          .where('task_id IN (:...ids)', { ids: taskIds })
          .execute();

        const reportRows = await taskReports
          .createQueryBuilder('r')
          .select(['r.id'])
          .where('r.taskId IN (:...ids)', { ids: taskIds })
          .getMany();
        const reportIds = reportRows.map((r) => r.id);
        if (reportIds.length) {
          await taskAttachments
            .createQueryBuilder()
            .delete()
            .where('task_report_id IN (:...ids)', { ids: reportIds })
            .execute();
        }

        await taskReports
          .createQueryBuilder()
          .delete()
          .where('task_id IN (:...ids)', { ids: taskIds })
          .execute();

        await taskSubgroupAssignments
          .createQueryBuilder()
          .delete()
          .where('task_id IN (:...ids)', { ids: taskIds })
          .execute();

        await tasks
          .createQueryBuilder()
          .delete()
          .where('id IN (:...ids)', { ids: taskIds })
          .execute();
      };

      const ownedOrganizations = await organizations.find({
        where: { createdBy: userId },
        select: ['id'],
      });
      for (const org of ownedOrganizations) {
        const orgId = org.id;

        // Detach any profiles pointing at this organization (if column exists in DB)
        await profiles
          .createQueryBuilder()
          .update(Profile)
          .set({ organizationId: null })
          .where('organization_id = :orgId', { orgId })
          .execute();

        await organizationInvitations.delete({ organizationId: orgId });
        await organizationMembers.delete({ organizationId: orgId });
        await organizationIdeas.delete({ organizationId: orgId });

        const chatRows = await chats.find({
          where: { organizationId: orgId },
          select: ['id'],
        });
        const chatIds = chatRows.map((c) => c.id);
        if (chatIds.length) {
          await chatReactions
            .createQueryBuilder()
            .delete()
            .where('message_id IN (:...ids)', { ids: chatIds })
            .execute();
          await chatAttachments
            .createQueryBuilder()
            .delete()
            .where('message_id IN (:...ids)', { ids: chatIds })
            .execute();
        }
        await chatTyping.delete({ organizationId: orgId });
        await chats.delete({ organizationId: orgId });

        const subgroupRows = await subgroups.find({
          where: { organizationId: orgId },
          select: ['id'],
        });
        const subgroupIds = subgroupRows.map((s) => s.id);
        if (subgroupIds.length) {
          await subgroupMembers
            .createQueryBuilder()
            .delete()
            .where('subgroup_id IN (:...ids)', { ids: subgroupIds })
            .execute();
          await taskSubgroupAssignments
            .createQueryBuilder()
            .delete()
            .where('subgroup_id IN (:...ids)', { ids: subgroupIds })
            .execute();
          await subgroups
            .createQueryBuilder()
            .delete()
            .where('organization_id = :orgId', { orgId })
            .execute();
        }

        const taskRows = await tasks.find({
          where: { organizationId: orgId },
          select: ['id'],
        });
        await deleteTasksByIds(taskRows.map((t) => t.id));

        await organizations.delete({ id: orgId });
      }

      // Invitations / memberships in other organizations
      await organizationInvitations.delete({ employeeId: userId });
      await organizationMembers.delete({ userId });

      // Ideas and notifications
      await organizationIdeas.delete({ userId });
      await notificationReads.delete({ userId });
      await goals.delete({ userId });
      await resetTokens.delete({ userId });

      // Chat activity
      await chatTyping.delete({ userId });
      await chatReactions.delete({ userId });

      const myChatRows = await chats.find({ where: { userId }, select: ['id'] });
      const myChatIds = myChatRows.map((c) => c.id);
      if (myChatIds.length) {
        await chats
          .createQueryBuilder()
          .update(OrganizationChat)
          .set({ replyToId: null })
          .where('reply_to IN (:...ids)', { ids: myChatIds })
          .execute();

        await chatReactions
          .createQueryBuilder()
          .delete()
          .where('message_id IN (:...ids)', { ids: myChatIds })
          .execute();
        await chatAttachments
          .createQueryBuilder()
          .delete()
          .where('message_id IN (:...ids)', { ids: myChatIds })
          .execute();

        await chats.delete({ userId });
      }

      // Tasks: delete tasks where user is creator/primary assignee
      const taskRows = await tasks
        .createQueryBuilder('t')
        .select(['t.id'])
        .where('t.assignedToId = :userId OR t.assignedById = :userId', { userId })
        .getMany();
      await deleteTasksByIds(taskRows.map((t) => t.id));

      // Remaining task-related rows referencing the user
      await taskAssignments.delete({ userId });

      const myReportRows = await taskReports.find({
        where: { userId },
        select: ['id'],
      });
      const myReportIds = myReportRows.map((r) => r.id);
      if (myReportIds.length) {
        await taskAttachments
          .createQueryBuilder()
          .delete()
          .where('task_report_id IN (:...ids)', { ids: myReportIds })
          .execute();
      }
      await taskReports.delete({ userId });

      // Subgroups created by the user (outside owned orgs)
      await subgroupMembers.delete({ userId });
      const mySubgroupRows = await subgroups.find({
        where: { createdBy: userId },
        select: ['id'],
      });
      const mySubgroupIds = mySubgroupRows.map((s) => s.id);
      if (mySubgroupIds.length) {
        await subgroupMembers
          .createQueryBuilder()
          .delete()
          .where('subgroup_id IN (:...ids)', { ids: mySubgroupIds })
          .execute();
        await taskSubgroupAssignments
          .createQueryBuilder()
          .delete()
          .where('subgroup_id IN (:...ids)', { ids: mySubgroupIds })
          .execute();
        await subgroups
          .createQueryBuilder()
          .delete()
          .where('id IN (:...ids)', { ids: mySubgroupIds })
          .execute();
      }

      await roles.delete({ userId });
      await profiles.delete({ id: userId });

      return { success: true };
    });

    return result;
  }
}
