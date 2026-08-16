import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { ValidationPipe } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';

import { MulterExceptionFilter } from './common/filters/multer-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const config = app.get(ConfigService);

  // =========================
  // VALIDATION
  // =========================

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // =========================
  // FILTER
  // =========================

  app.useGlobalFilters(new MulterExceptionFilter());

  // =========================
  // TRUST PROXY
  // =========================
  // Required when running behind a reverse proxy (Railway, Vercel,
  // nginx...), so req.ip / HTTPS handling are correct.

  app.set('trust proxy', 1);

  // =========================
  // CORS
  // =========================
  // 1) If CORS_ORIGIN is set (comma-separated list) it is used, e.g.
  //    CORS_ORIGIN=https://ims-frontend.up.railway.app
  // 2) Otherwise ANY request Origin is reflected. This is safe because
  //    auth uses an Authorization header (not cookies).
  // localhost:4200 (dev) is always allowed.

  const configuredOrigins = config
    .get<string>('CORS_ORIGIN', '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const origins = Array.from(
    new Set([...configuredOrigins, 'http://localhost:4200']),
  );

  app.enableCors({
    origin: configuredOrigins.length > 0 ? origins : true,
    credentials: true,
  });

  // =========================
  // PORT
  // =========================

  // Default 3000 matches the frontend dev apiUrl (http://localhost:3000).
  // Deploy hosts (Railway/Vercel) override this via the PORT env var.
  const port = Number(config.get<string>('PORT', '3000'));

  await app.listen(port, '0.0.0.0');

  console.log(`API running on port ${port}`);
}

void bootstrap();
