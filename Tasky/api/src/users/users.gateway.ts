import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true })
export class UsersGateway {
    @WebSocketServer()
    server: Server;

    emitProfileUpdated(userId: string, profile: any) {
        // Faqat shu userga yuborish (private room)
        this.server.to(`user:${userId}`).emit('profile_updated', profile);
    }
}
