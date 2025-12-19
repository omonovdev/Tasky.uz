import { IsString, IsOptional, IsInt } from 'class-validator';

export class UpdateStageDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  orderIndex?: number;

  @IsOptional()
  @IsString()
  status?: string;
}
