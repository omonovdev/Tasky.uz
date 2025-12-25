import { IsString, Length } from 'class-validator';

export class VerifyResetCodeDto {
  @IsString()
  @Length(6, 6, { message: 'Reset code must be exactly 6 digits' })
  token: string;
}
