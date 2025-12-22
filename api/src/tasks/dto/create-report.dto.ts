import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateReportDto {
  @IsString()
  reportText!: string;

  @IsOptional()
  @IsArray()
  attachments?: {
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize?: number;
  }[];
}
