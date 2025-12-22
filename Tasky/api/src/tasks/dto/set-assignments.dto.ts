import { IsArray } from 'class-validator';

export class SetAssignmentsDto {
  @IsArray()
  assigneeIds!: string[];
}
