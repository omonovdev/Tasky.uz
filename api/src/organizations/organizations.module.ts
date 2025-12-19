import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Organization,
  OrganizationMember,
  OrganizationInvitation,
  OrganizationIdea,
  OrganizationChat,
  OrganizationChatAttachment,
  OrganizationChatReaction,
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
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      OrganizationMember,
      OrganizationInvitation,
      OrganizationIdea,
      OrganizationChat,
      OrganizationChatAttachment,
      OrganizationChatReaction,
      Profile,
      Subgroup,
      SubgroupMember,
      Task,
      TaskAssignment,
      TaskStage,
      TaskReport,
      TaskAttachment,
      TaskSubgroupAssignment,
    ]),
  ],
  providers: [OrganizationsService],
  controllers: [OrganizationsController],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
