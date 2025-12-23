
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
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteDto } from './dto/invite.dto';
import { AcceptAgreementDto } from './dto/accept-agreement.dto';
import { UpdateMemberPositionDto } from './dto/update-member-position.dto';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService) { }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateOrganizationDto) {
    return this.orgs.create(user.userId, dto);
  }

  @Get('me')
  myOrgs(@CurrentUser() user: any) {
    return this.orgs.listForUser(user.userId);
  }

  @Get('me/memberships')
  myMemberships(@CurrentUser() user: any) {
    return this.orgs.membershipsForUser(user.userId);
  }

  @Get('search')
  search(@Query('q') q: string) {
    return this.orgs.search(q);
  }

  @Get('invitations/me')
  myInvitations(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.orgs.listInvitationsForEmployee(user.userId, status);
  }

  @Patch('members/:memberId')
  updateMemberPosition(
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateMemberPositionDto,
  ) {
    return this.orgs.updateMemberPosition(memberId, user.userId, dto);
  }
  @Get(':id/my-role')
  getMyRoleForOrg(@Param('id') id: string, @CurrentUser() user: any) {
    return this.orgs.getMyRoleForOrganization(id, user.userId);
  }
  @Delete('members/:memberId')
  removeMember(@Param('memberId') memberId: string, @CurrentUser() user: any) {
    return this.orgs.removeMember(memberId, user.userId);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.orgs.getOrg(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.orgs.update(id, user.userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.orgs.delete(id, user.userId);
  }

  @Get(':id/members')
  members(@Param('id') id: string) {
    return this.orgs.membersOf(id);
  }

  @Get(':id/invitations')
  invitations(@Param('id') id: string, @CurrentUser() user: any) {
    return this.orgs.listInvitationsForOrg(id, user.userId);
  }

  @Post(':id/invitations')
  invite(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: InviteDto,
  ) {
    return this.orgs.invite(id, user.userId, dto);
  }

  @Post('invitations/:invId/accept')
  accept(@Param('invId') invId: string, @CurrentUser() user: any) {
    return this.orgs.acceptInvitation(user.userId, invId);
  }

  @Post('invitations/:invId/decline')
  decline(@Param('invId') invId: string, @CurrentUser() user: any) {
    return this.orgs.declineInvitation(user.userId, invId);
  }

  @Post(':id/agreement')
  acceptAgreement(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: AcceptAgreementDto,
  ) {
    return this.orgs.acceptAgreement(user.userId, id, dto);
  }
}
