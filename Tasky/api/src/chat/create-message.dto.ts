import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  organizationId!: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  replyToId?: string;

  @IsOptional()
  @IsArray()
  attachments?: {
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize?: number;
  }[];
}
