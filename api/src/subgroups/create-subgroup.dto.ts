import { IsString } from 'class-validator';

export class CreateSubgroupDto {
  @IsString()
  organizationId!: string;

  @IsString()
  name!: string;

  @IsString()
  description!: string;
}
