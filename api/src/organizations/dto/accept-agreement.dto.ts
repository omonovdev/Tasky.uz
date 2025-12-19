import { IsInt, IsOptional, Min } from 'class-validator';

export class AcceptAgreementDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  agreementVersion?: number;
}

