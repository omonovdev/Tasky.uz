import { IsOptional, IsString } from 'class-validator';

export class UpdateOrganizationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  subheadline?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  motto?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string | null;

  @IsString()
  @IsOptional()
  agreementText?: string;
}
