import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  goalType?: string;

  @IsOptional()
  @IsString()
  goalText?: string;

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
