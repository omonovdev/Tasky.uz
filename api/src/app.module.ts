import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { validateEnv } from './config/env.validation';
import { buildTypeOrmConfig } from './config/typeorm.config';
import { LoggerService } from './common/logger.service';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { TasksModule } from './tasks/tasks.module';
import { GoalsModule } from './goals/goals.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SubgroupsModule } from './subgroups/subgroups.module';
import { ChatModule } from './chat/chat.module';
import { IdeasModule } from './ideas/ideas.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => buildTypeOrmConfig(config),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, 
        limit: 100, 
        skipIf: (context) =>
          context.switchToHttp().getRequest()?.method === 'OPTIONS',
      },
    ]),
    AuthModule,
    UsersModule,
    OrganizationsModule,
    TasksModule,
    GoalsModule,
    NotificationsModule,
    SubgroupsModule,
    ChatModule,
    IdeasModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    LoggerService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
