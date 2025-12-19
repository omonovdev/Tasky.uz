import { IsOptional, IsString } from 'class-validator';

export class InviteDto {
  @IsString()
  employeeId!: string;

  @IsString()
  @IsOptional()
  invitationMessage?: string;

  @IsString()
  @IsOptional()
  contractDuration?: string;
}
