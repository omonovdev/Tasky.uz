import { IsString } from 'class-validator';

export class MarkReadDto {
  @IsString()
  notificationType!: string;

  @IsString()
  notificationId!: string;
}
