import { Injectable } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from '@nestjs/websockets';
import { Request } from 'express';
import { Server, Socket } from 'socket.io';
import { config } from './config';
import { PlatformService } from './platform.service';

export type SchoolChange = { area: 'academic' | 'school'; yearId?: string };

@Injectable()
@WebSocketGateway({ path: '/socket.io', transports: ['websocket'], cors: { origin: config.APP_ORIGIN, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  constructor(private readonly platform: PlatformService) {}

  async handleConnection(client: Socket) {
    const schoolId = client.handshake.auth?.schoolId;
    if (client.handshake.headers.origin !== config.APP_ORIGIN || typeof schoolId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(schoolId)) {
      client.disconnect(true); return;
    }
    try {
      const request = client.request as Request;
      const { user } = await this.platform.authorize(request, schoolId);
      client.data.schoolId = schoolId;
      client.data.userId = user.id;
      client.data.role = request.session.selectedRole;
      await client.join(`school:${schoolId}`);
      await client.join(`school:${schoolId}:role:${request.session.selectedRole}`);
      client.emit('school:ready');
    } catch { client.disconnect(true); }
  }

  async changed(schoolId: string, change: SchoolChange) {
    if (!this.server) return;
    for (const client of this.server.sockets.sockets.values()) {
      if (client.data.schoolId !== schoolId) continue;
      try {
        const request = client.request as Request;
        await new Promise<void>((resolve, reject) => request.session.reload(error => error ? reject(error) : resolve()));
        await this.platform.authorize(request, schoolId);
        client.data.role = request.session.selectedRole;
        if (change.area === 'academic' && !['HEADMASTER','ACADEMIC','TEACHER'].includes(client.data.role)) continue;
        client.emit('school:changed', change);
      } catch { client.disconnect(true); }
    }
  }
}
