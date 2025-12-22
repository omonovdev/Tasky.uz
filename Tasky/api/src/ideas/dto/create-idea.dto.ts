import { IsOptional, IsString } from 'class-validator';

export class CreateIdeaDto {
  @IsString()
  organizationId!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

