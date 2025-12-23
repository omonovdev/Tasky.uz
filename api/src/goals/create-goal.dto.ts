import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateGoalDto {
  @IsString()
  goalType!: string;

  @IsString()
  goalText!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsString()
  pictureUrl?: string;
}
