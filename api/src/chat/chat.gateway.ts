import {
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './create-message.dto';
import { ReactMessageDto } from './react-message.dto';

interface SocketWithAuth extends Socket {
  userId?: string;
}

@WebSocketGateway({ cors: true })
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly chat: ChatService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  server!: Server;

  afterInit(server: Server) {
    this.server = server;
  }

  async handleConnection(client: SocketWithAuth) {
    try {
      const token = this.extractTokenFromSocket(client);
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });

      client.userId = payload.sub;
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: SocketWithAuth) {
    // Clean up any rooms if needed
  }

  private extractTokenFromSocket(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.startsWith('Bearer ') ? authToken.slice(7) : authToken;
    }

    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.trim()) {
      return queryToken.startsWith('Bearer ') ? queryToken.slice(7) : queryToken;
    }

    const authHeader = client.handshake.headers.authorization;
    if (typeof authHeader !== 'string' || !authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

    return parts[1];
  }

  @SubscribeMessage('join_org')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { organizationId: string },
  ) {
    if (data?.organizationId) {
      const room = `org:${data.organizationId}`;
      client.join(room);
    }
  }

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: SocketWithAuth,
    @MessageBody() payload: CreateMessageDto,
  ) {
    if (!client.userId || !payload) {
      throw new WsException('Unauthorized');
    }

    try {
      const msg = await this.chat.createMessage(client.userId, payload);
      const room = `org:${msg.organizationId}`;
      this.server.to(room).emit('message', msg);
    } catch (error) {
      throw new WsException('Failed to send message');
    }
  }

  @SubscribeMessage('reaction')
  async handleReaction(
    @ConnectedSocket() client: SocketWithAuth,
    @MessageBody() payload: ReactMessageDto,
  ) {
    if (!client.userId || !payload) {
      throw new WsException('Unauthorized');
    }

    try {
      const msg = await this.chat.react(client.userId, payload);
      const room = `org:${msg.organizationId}`;
      this.server.to(room).emit('reaction', msg);
    } catch (error) {
      throw new WsException('Failed to react');
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: SocketWithAuth,
    @MessageBody() data: { organizationId: string },
  ) {
    if (!client.userId || !data?.organizationId) {
      throw new WsException('Unauthorized');
    }

    const room = `org:${data.organizationId}`;
    this.server.to(room).emit('typing', { userId: client.userId });
  }
}
