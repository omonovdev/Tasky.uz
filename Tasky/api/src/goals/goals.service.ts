import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserGoal } from '../entities';
import { CreateGoalDto } from './create-goal.dto';
import { UpdateGoalDto } from './update-goal.dto';

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(UserGoal) private readonly goals: Repository<UserGoal>,
  ) {}

  async listForUser(userId: string) {
    return this.goals.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async create(userId: string, dto: CreateGoalDto) {
    const goal = this.goals.create({
      userId,
      goalType: dto.goalType,
      goalText: dto.goalText,
      description: dto.description,
      deadline: dto.deadline ? new Date(dto.deadline) : null,
      pictureUrl: dto.pictureUrl,
    });
    return this.goals.save(goal);
  }

  async update(id: string, userId: string, dto: UpdateGoalDto) {
    const goal = await this.goals.findOne({ where: { id, userId } });
    if (!goal) throw new NotFoundException('Goal not found');
    goal.goalType = dto.goalType ?? goal.goalType;
    goal.goalText = dto.goalText ?? goal.goalText;
    goal.description = dto.description ?? goal.description;
    goal.deadline = dto.deadline ? new Date(dto.deadline) : goal.deadline;
    goal.pictureUrl = dto.pictureUrl ?? goal.pictureUrl;
    return this.goals.save(goal);
  }

  async delete(id: string, userId: string) {
    const goal = await this.goals.findOne({ where: { id, userId } });
    if (!goal) throw new NotFoundException('Goal not found');
    await this.goals.delete({ id });
    return { success: true };
  }
}
