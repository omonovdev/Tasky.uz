import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateStageDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  orderIndex!: number;

  @IsOptional()
  @IsString()
  status?: string;
}
