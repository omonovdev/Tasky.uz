import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const buildTypeOrmConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => {
  const isProd = config.get<string>('NODE_ENV') === 'production';
  const syncEnabled = config.get<string>('DB_SYNC') === 'true';

  // Never allow synchronize in production
  if (isProd && syncEnabled) {
    console.warn('⚠️  WARNING: DB_SYNC is ignored in production mode');
  }

  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: parseInt(config.get<string>('DB_PORT', '5432'), 10),
    database: config.get<string>('DB_NAME', 'tasky'),
    username: config.get<string>('DB_USER', 'postgres'),
    password: config.get<string>('DB_PASSWORD', ''),
    autoLoadEntities: true,
    synchronize: !isProd && syncEnabled, // Only in development
    logging: config.get<string>('NODE_ENV') === 'development',
  };
};
