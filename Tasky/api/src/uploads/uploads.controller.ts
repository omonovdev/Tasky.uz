import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

const safeFolder = (folder: string) => {
  const cleaned = (folder || '').trim();
  if (!cleaned) return 'misc';
  if (!/^[a-zA-Z0-9_-]+$/.test(cleaned)) return 'misc';
  return cleaned;
};

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (
          req: Request,
          file: Express.Multer.File,
          cb: (error: Error | null, destination: string) => void,
        ) => {
          const folder = safeFolder((req as any)?.body?.folder);
          // Save the sanitized folder on the request so we can reuse
          // the exact same value when generating the public URL.
          (req as any)._uploadFolder = folder;
          const uploadsRoot = path.join(process.cwd(), 'uploads');
          const dest = path.join(uploadsRoot, folder);
          fs.mkdirSync(dest, { recursive: true });
          cb(null, dest);
        },
        filename: (
          req: Request,
          file: Express.Multer.File,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          const ext = path.extname(file.originalname || '');
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('folder') folder: string,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    // Prefer the folder that was actually used by multer when saving
    // the file, so the URL always matches the real filesystem path.
    const finalFolder =
      (req as any)._uploadFolder !== undefined
        ? (req as any)._uploadFolder
        : safeFolder(folder);
    const url = `${baseUrl}/uploads/${finalFolder}/${file.filename}`;

    return {
      url,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
    };
  }
}
