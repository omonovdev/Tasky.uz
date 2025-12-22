import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { SetAssignmentsDto } from './dto/set-assignments.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  async list(
    @CurrentUser() user: any,
    @Query('organizationId') organizationId?: string,
    @Query('status') status?: string,
    @Query('all') all?: string,
    @Query('ids') ids?: string,
    @Query('assignedById') assignedById?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedIds = ids ? ids.split(',').filter(Boolean) : undefined;
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const parsedOffset = offset ? parseInt(offset, 10) : undefined;

    return this.tasks.listForUser(user.userId, {
      organizationId: organizationId || undefined,
      status: status || undefined,
      all: all === 'true',
      ids: parsedIds,
      assignedById: assignedById || undefined,
      limit: parsedLimit,
      offset: parsedOffset,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.tasks.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateTaskDto, @CurrentUser() user: any) {
    return this.tasks.create(dto, user.userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: any,
  ) {
    return this.tasks.update(id, dto, user.userId);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.tasks.updateStatus(id, dto, user.userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tasks.deleteTask(id, user.userId);
  }

  @Post(':id/assignments')
  async setAssignments(
    @Param('id') id: string,
    @Body() dto: SetAssignmentsDto,
  ) {
    return this.tasks.setAssignments(id, dto);
  }

  @Post(':id/stages')
  async addStage(@Param('id') id: string, @Body() dto: CreateStageDto) {
    return this.tasks.addStage(id, dto);
  }

  @Patch('stages/:stageId')
  async updateStage(
    @Param('stageId') stageId: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.tasks.updateStage(stageId, dto);
  }

  @Delete('stages/:stageId')
  async deleteStage(@Param('stageId') stageId: string) {
    return this.tasks.deleteStage(stageId);
  }

  @Post(':id/reports')
  async addReport(
    @Param('id') id: string,
    @Body() dto: CreateReportDto,
    @CurrentUser() user: any,
  ) {
    return this.tasks.addReport(id, user.userId, dto);
  }
}
