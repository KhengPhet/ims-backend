import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { MulterExceptionFilter } from './common/filters/multer-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.useGlobalFilters(new MulterExceptionFilter());

  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:4200'),
    credentials: true,
  });

  const port = Number(config.get<string>('PORT', '8080'));
  await app.listen(port ,"0.0.0.0");
  console.log(`API running on http://localhost:${port}`);
}
void bootstrap();
