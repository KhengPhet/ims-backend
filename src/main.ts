import {
  NestFactory
} from '@nestjs/core';

import {
  ValidationPipe
} from '@nestjs/common';

import {
  ConfigService
} from '@nestjs/config';

import { AppModule } from './app.module';

import {
  MulterExceptionFilter
} from './common/filters/multer-exception.filter';

async function bootstrap() {

  const app =
    await NestFactory.create(AppModule);

  const config =
    app.get(ConfigService);

  // =========================
  // VALIDATION
  // =========================

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    })
  );

  // =========================
  // FILTER
  // =========================

  app.useGlobalFilters(
    new MulterExceptionFilter()
  );

  // =========================
  // CORS
  // =========================

  const corsOrigin =
    config.get<string>(
      'CORS_ORIGIN',
      'http://localhost:4200'
    );

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // =========================
  // PORT
  // =========================

  const port =
    Number(
      config.get<string>('PORT', '8080')
    );

  await app.listen(
    port,
    '0.0.0.0'
  );

  console.log(
    `API running on port ${port}`
  );
}

void bootstrap();