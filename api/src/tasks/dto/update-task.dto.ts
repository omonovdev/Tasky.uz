import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  IsUUID,
  IsArray,
} from 'class-validator';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsString()
  customGoal?: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsInt()
  estimatedCompletionHours?: number;

  @IsOptional()
  @IsArray()
  assigneeIds?: string[];

  @IsOptional()
  @IsArray()
  subgroupIds?: string[];

  @IsOptional()
  @IsString()
  status?: string;
}
