import { IsIn } from 'class-validator';

export class SetRoleDto {
  @IsIn(['employee', 'employer'])
  role!: 'employee' | 'employer';
}
