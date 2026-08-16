import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Production (Railway) MUST use DATABASE_URL.
        // If DATABASE_URL is present it wins; host/port/username/password
        // are only used as a local fallback when DATABASE_URL is absent.
        const databaseUrl = config.get<string>('DATABASE_URL');

        return {
          type: 'postgres',
          ...(databaseUrl ? { url: databaseUrl } : {}),
          host: config.get<string>('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USERNAME', 'postgres'),
          password: config.get<string>('DB_PASSWORD', ''),
          database: config.get<string>('DB_DATABASE', 'ims'),
          autoLoadEntities: true,
          // Safe default so the app "just works" on first deploy.
          // Set DB_SYNC=false once you introduce real migrations.
          synchronize: config.get<string>('DB_SYNC', 'true') === 'true',
        };
      },
    }),
    AuthModule,
    UsersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
