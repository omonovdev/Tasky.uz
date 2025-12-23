import { Body, Controller, Delete, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { UpdateProfileDto } from './update-profile.dto';
import { SetRoleDto } from './set-role.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: any) {
    return this.users.getById(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  async deleteMe(@CurrentUser() user: any) {
    return this.users.deleteAccount(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async update(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/role')
  async setRole(@CurrentUser() user: any, @Body() dto: SetRoleDto) {
    return this.users.setRole(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/role')
  async myRole(@CurrentUser() user: any) {
    return this.users.getRole(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('search')
  async search(@Query('q') q: string, @Query('exclude') exclude?: string) {
    return this.users.search(q, exclude);
  }
}
