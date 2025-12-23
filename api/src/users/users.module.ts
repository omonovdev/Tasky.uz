import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { Profile, UserRole } from '../entities';
import { UsersGateway } from './users.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Profile, UserRole])],
  providers: [UsersService, UsersGateway],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule { }
