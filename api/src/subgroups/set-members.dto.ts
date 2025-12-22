import { IsArray } from 'class-validator';

export class SetMembersDto {
  @IsArray()
  userIds!: string[];
}
