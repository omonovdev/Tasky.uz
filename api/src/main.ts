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
    origin: ['https://tasky.uz', 'http://localhost:5173', 'http://localhost:4173'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
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
