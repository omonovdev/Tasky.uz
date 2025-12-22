import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      TaskAssignment,
      TaskStage,
      TaskReport,
      TaskAttachment,
      TaskSubgroupAssignment,
      SubgroupMember,
      Profile,
    ]),
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
