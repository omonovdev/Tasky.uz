import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const clientOrigins = (config.get<string>('CLIENT_URL') || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: clientOrigins.length > 0 ? clientOrigins : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
      validateCustomDecorators: true,
    }),
  );

  const uploadsRoot = path.join(process.cwd(), 'uploads');
  fs.mkdirSync(uploadsRoot, { recursive: true });
  app.use('/uploads', express.static(uploadsRoot));

  const port = config.get<number>('PORT') || 3000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}
bootstrap();
