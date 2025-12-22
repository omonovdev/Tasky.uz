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
import { SubgroupsService } from './subgroups.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { CreateSubgroupDto } from './create-subgroup.dto';
import { UpdateSubgroupDto } from './update-subgroup.dto';
import { SetMembersDto } from './set-members.dto';

@Controller('subgroups')
@UseGuards(JwtAuthGuard)
export class SubgroupsController {
  constructor(private readonly subgroups: SubgroupsService) {}

  @Get()
  async list(@Query('organizationId') organizationId: string) {
    return this.subgroups.list(organizationId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.subgroups.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateSubgroupDto, @CurrentUser() user: any) {
    return this.subgroups.create(dto, user.userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSubgroupDto,
    @CurrentUser() user: any,
  ) {
    return this.subgroups.update(id, dto, user.userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.subgroups.delete(id, user.userId);
  }

  @Post(':id/members')
  async setMembers(@Param('id') id: string, @Body() dto: SetMembersDto) {
    return this.subgroups.setMembers(id, dto);
  }

  @Delete(':id/members/:userId')
  async removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.subgroups.removeMember(id, userId);
  }
}
