import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { IdeasService } from './ideas.service';

@Controller('ideas')
@UseGuards(JwtAuthGuard)
export class IdeasController {
  constructor(private readonly ideas: IdeasService) {}

  @Get(':organizationId')
  async list(@Param('organizationId') organizationId: string, @CurrentUser() user: any) {
    return this.ideas.listByOrg(user.userId, organizationId);
  }

  @Post()
  async create(@Body() dto: CreateIdeaDto, @CurrentUser() user: any) {
    return this.ideas.create(user.userId, dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateIdeaDto>,
    @CurrentUser() user: any,
  ) {
    return this.ideas.update(id, user.userId, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ideas.delete(id, user.userId);
  }
}


