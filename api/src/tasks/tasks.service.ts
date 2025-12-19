import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Task,
  TaskAssignment,
  TaskStage,
  TaskReport,
  TaskAttachment,
  TaskSubgroupAssignment,
  SubgroupMember,
  Profile,
} from '../entities';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { SetAssignmentsDto } from './dto/set-assignments.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(TaskAssignment)
    private readonly assignments: Repository<TaskAssignment>,
    @InjectRepository(TaskStage) private readonly stages: Repository<TaskStage>,
    @InjectRepository(TaskReport)
    private readonly reports: Repository<TaskReport>,
    @InjectRepository(TaskAttachment)
    private readonly attachments: Repository<TaskAttachment>,
    @InjectRepository(TaskSubgroupAssignment)
    private readonly subgroupAssignments: Repository<TaskSubgroupAssignment>,
    @InjectRepository(SubgroupMember)
    private readonly subgroupMembers: Repository<SubgroupMember>,
    @InjectRepository(Profile) private readonly profiles: Repository<Profile>,
  ) {}

  private async ensureTask(id: string) {
    const task = await this.tasks.findOne({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async listForUser(
    userId: string,
    query: {
      organizationId?: string;
      status?: string;
      all?: boolean;
      ids?: string[];
      assignedById?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const qb = this.tasks
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignments', 'assignment')
      .leftJoinAndSelect('assignment.user', 'assignmentUser')
      .leftJoinAndSelect('task.stages', 'stage')
      .leftJoinAndSelect('task.reports', 'report')
      .leftJoinAndSelect('report.user', 'reportUser')
      .leftJoinAndSelect('report.attachments', 'reportAttachment')
      .leftJoinAndSelect('task.subgroupAssignments', 'subgroupAssignments')
      .leftJoinAndSelect('subgroupAssignments.subgroup', 'subgroup')
      .leftJoinAndSelect('task.assignedTo', 'assignedTo')
      .leftJoinAndSelect('task.assignedBy', 'assignedBy')
      .where('1=1');

    if (query.assignedById) {
      if (query.assignedById !== userId) {
        throw new ForbiddenException('Not allowed');
      }
      qb.andWhere('task.assignedById = :assignedById', {
        assignedById: query.assignedById,
      });
    } else if (!query.all) {
      qb.andWhere('assignment.userId = :userId', { userId });
    }
    if (query.organizationId) {
      qb.andWhere('task.organizationId = :organizationId', {
        organizationId: query.organizationId,
      });
    }
    if (query.status) {
      qb.andWhere('task.status = :status', { status: query.status });
    }
    if (query.ids && query.ids.length) {
      qb.andWhere('task.id IN (:...ids)', { ids: query.ids });
    }

    qb.orderBy('task.deadline', 'ASC');

    // Pagination
    const limit = Math.min(query.limit || 50, 100); // Max 100
    const offset = query.offset || 0;
    qb.take(limit).skip(offset);

    return qb.getMany();
  }

  async findOne(id: string) {
    const task = await this.tasks.findOne({
      where: { id },
      relations: [
        'assignments',
        'assignments.user',
        'stages',
        'reports',
        'reports.user',
        'reports.attachments',
        'subgroupAssignments',
        'subgroupAssignments.subgroup',
        'assignedTo',
        'assignedBy',
      ],
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async create(dto: CreateTaskDto, currentUserId: string) {
    const task = this.tasks.create({
      title: dto.title,
      description: dto.description,
      goal: dto.goal,
      customGoal: dto.customGoal,
      organizationId: dto.organizationId,
      assignedById: currentUserId,
      assignedToId: dto.assignedToId,
      deadline: new Date(dto.deadline),
      estimatedCompletionHours: dto.estimatedCompletionHours,
      status: 'pending',
    });
    const saved = await this.tasks.save(task);

    let assignees = dto.assigneeIds?.length ? dto.assigneeIds : [dto.assignedToId];

    if (dto.subgroupIds?.length) {
      const subgroupMembers = await this.subgroupMembers.find({
        where: { subgroupId: In(dto.subgroupIds) },
      });
      const subgroupUserIds = subgroupMembers.map((m) => m.userId).filter(Boolean);
      assignees = Array.from(new Set([...assignees, ...subgroupUserIds]));
    }

    if (assignees?.length) {
      const rows = assignees.map((userId: string) =>
        this.assignments.create({ taskId: saved.id, userId }),
      );
      await this.assignments.save(rows);
    }

    if (dto.subgroupIds?.length) {
      const rows = dto.subgroupIds.map((subgroupId: string) =>
        this.subgroupAssignments.create({ taskId: saved.id, subgroupId }),
      );
      await this.subgroupAssignments.save(rows);
    }

    const defaultStages = [
      { title: 'Planning', orderIndex: 1 },
      { title: 'In Progress', orderIndex: 2 },
      { title: 'Review', orderIndex: 3 },
      { title: 'Complete', orderIndex: 4 },
    ].map((s) =>
      this.stages.create({
        taskId: saved.id,
        title: s.title,
        orderIndex: s.orderIndex,
        status: 'pending',
      }),
    );
    await this.stages.save(defaultStages);

    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateTaskDto, currentUserId: string) {
    const task = await this.ensureTask(id);
    task.title = dto.title ?? task.title;
    task.description = dto.description ?? task.description;
    task.goal = dto.goal ?? task.goal;
    task.customGoal = dto.customGoal ?? task.customGoal;
    task.organizationId = dto.organizationId ?? task.organizationId;
    task.assignedToId = dto.assignedToId ?? task.assignedToId;
    task.deadline = dto.deadline ? new Date(dto.deadline) : task.deadline;
    task.estimatedCompletionHours =
      dto.estimatedCompletionHours ?? task.estimatedCompletionHours;
    task.lastEditedAt = new Date();
    task.lastEditedBy = currentUserId;
    if (dto.status) task.status = dto.status as any;

    const saved = await this.tasks.save(task);

    if (dto.assigneeIds) {
      await this.assignments.delete({ taskId: id });
      const rows = dto.assigneeIds.map((userId: string) =>
        this.assignments.create({ taskId: id, userId }),
      );
      if (rows.length) await this.assignments.save(rows);
    }

    if (dto.subgroupIds) {
      await this.subgroupAssignments.delete({ taskId: id });
      const rows = dto.subgroupIds.map((subgroupId: string) =>
        this.subgroupAssignments.create({ taskId: id, subgroupId }),
      );
      if (rows.length) await this.subgroupAssignments.save(rows);
    }

    return this.findOne(saved.id);
  }

  async updateStatus(id: string, dto: UpdateStatusDto, currentUserId: string) {
    const task = await this.ensureTask(id);
    task.status = dto.status as any;
    if (dto.status === 'in_progress' && !task.startedAt) {
      task.startedAt = new Date();
    }
    if (dto.status === 'completed') {
      task.actualCompletedAt = new Date();
    }
    task.declineReason = dto.declineReason ?? task.declineReason;
    task.lastEditedAt = new Date();
    task.lastEditedBy = currentUserId;
    await this.tasks.save(task);
    return this.findOne(id);
  }

  async setAssignments(id: string, dto: SetAssignmentsDto) {
    await this.ensureTask(id);
    await this.assignments.delete({ taskId: id });
    const rows = dto.assigneeIds.map((userId: string) =>
      this.assignments.create({ taskId: id, userId }),
    );
    if (rows.length) await this.assignments.save(rows);
    return this.findOne(id);
  }

  async addStage(taskId: string, dto: CreateStageDto) {
    await this.ensureTask(taskId);
    const stage = this.stages.create({
      taskId,
      title: dto.title,
      description: dto.description,
      orderIndex: dto.orderIndex,
      status: dto.status,
    });
    await this.stages.save(stage);
    return this.findOne(taskId);
  }

  async updateStage(stageId: string, dto: UpdateStageDto) {
    const stage = await this.stages.findOne({ where: { id: stageId } });
    if (!stage) throw new NotFoundException('Stage not found');
    stage.title = dto.title ?? stage.title;
    stage.description = dto.description ?? stage.description;
    stage.orderIndex = dto.orderIndex ?? stage.orderIndex;
    stage.status = dto.status ?? stage.status;
    await this.stages.save(stage);
    return this.findOne(stage.taskId);
  }

  async deleteStage(stageId: string) {
    const stage = await this.stages.findOne({ where: { id: stageId } });
    if (!stage) throw new NotFoundException('Stage not found');
    await this.stages.delete({ id: stageId });
    return this.findOne(stage.taskId);
  }

  async addReport(taskId: string, userId: string, dto: CreateReportDto) {
    await this.ensureTask(taskId);
    const report = this.reports.create({
      taskId,
      userId,
      reportText: dto.reportText,
    });
    const saved = await this.reports.save(report);

    if (dto.attachments?.length) {
      const rows = dto.attachments.map((a: any) =>
        this.attachments.create({
          taskReportId: saved.id,
          fileUrl: a.fileUrl,
          fileName: a.fileName,
          fileType: a.fileType,
          fileSize: a.fileSize,
        }),
      );
      await this.attachments.save(rows);
    }

    return this.findOne(taskId);
  }

  async deleteTask(taskId: string, userId: string) {
    const task = await this.tasks.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    const hasAssignment = await this.assignments.findOne({
      where: { taskId, userId },
    });
    if (!hasAssignment && task.assignedById !== userId) {
      throw new ForbiddenException('Not allowed to delete this task');
    }

    const reports = await this.reports.find({ where: { taskId } });
    const reportIds = reports.map((r) => r.id);
    if (reportIds.length) {
      await this.attachments
        .createQueryBuilder()
        .delete()
        .where('task_report_id IN (:...ids)', { ids: reportIds })
        .execute();
    }

    await this.reports.delete({ taskId });
    await this.stages.delete({ taskId });
    await this.assignments.delete({ taskId });
    await this.subgroupAssignments.delete({ taskId });
    await this.tasks.delete({ id: taskId });

    return { success: true };
  }
}
