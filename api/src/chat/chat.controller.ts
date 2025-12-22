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
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { CreateMessageDto } from './create-message.dto';
import { ReactMessageDto } from './react-message.dto';
import { UpdateMessageDto } from './update-message.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get(':organizationId')
  async list(
    @Param('organizationId') organizationId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    return this.chat.listByOrg(organizationId, parsedLimit);
  }

  @Post()
  async create(@Body() dto: CreateMessageDto, @CurrentUser() user: any) {
    return this.chat.createMessage(user.userId, dto);
  }

  @Post('react')
  async react(@Body() dto: ReactMessageDto, @CurrentUser() user: any) {
    return this.chat.react(user.userId, dto);
  }

  @Patch(':id')
  async edit(
    @Param('id') id: string,
    @Body() dto: UpdateMessageDto,
    @CurrentUser() user: any,
  ) {
    return this.chat.editMessage(user.userId, id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.chat.deleteMessage(id);
  }
}
