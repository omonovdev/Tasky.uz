import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateStatusDto {
  @IsString()
  @IsIn(['pending', 'in_progress', 'completed'], {
    message: 'Status must be one of: pending, in_progress, completed',
  })
  status!: string;

  @IsOptional()
  @IsString()
  declineReason?: string;
}
