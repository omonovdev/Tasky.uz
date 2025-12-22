import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsUUID,
  IsInt,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  title!: string;

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

  @IsUUID()
  assignedToId!: string;

  @IsDateString()
  deadline!: string;

  @IsOptional()
  @IsInt()
  estimatedCompletionHours?: number;

  @IsOptional()
  @IsArray()
  assigneeIds?: string[];

  @IsOptional()
  @IsArray()
  subgroupIds?: string[];
}
