import { IsOptional, IsString } from 'class-validator';

export class UpdateSubgroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
