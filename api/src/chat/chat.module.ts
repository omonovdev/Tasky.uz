import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import {
  OrganizationChat,
  OrganizationChatReaction,
  OrganizationChatAttachment,
  OrganizationChatTyping,
  Profile,
} from '../entities';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizationChat,
      OrganizationChatReaction,
      OrganizationChatAttachment,
      OrganizationChatTyping,
      Profile,
    ]),
    JwtModule.register({}),
    ConfigModule,
  ],
  providers: [ChatService, ChatGateway],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
