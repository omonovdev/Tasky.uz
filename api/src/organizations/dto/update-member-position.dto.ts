import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMemberPositionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  position!: string;
}

