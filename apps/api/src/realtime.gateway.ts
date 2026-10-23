import { Metrics } from './monitoring/metrics';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from '@nestjs/websockets';
import { Request } from 'express';
import { Server, Socket } from 'socket.io';
import { RealtimeBus, Invalidation } from './realtime-bus';
import { config } from './config';
import { PlatformService } from './platform.service';

export type SchoolChange = { area: 'academic' | 'school'; yearId?: string };

@Injectable()
@WebSocketGateway({ path: '/socket.io', transports: ['websocket'], cors: { origin: config.APP_ORIGIN, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection, OnModuleDestroy {
  @WebSocketServer() server!: Server;
  private readonly pending = new Map<string, Invalidation>();
  private readonly platformClients = new Set<Socket>();
  private timer?: NodeJS.Timeout;
  private idleTimer?: NodeJS.Timeout;
  private flushing = false;
  private readonly unsubscribe: () => void;
  constructor(private readonly platform: PlatformService, private readonly bus: RealtimeBus, private readonly metrics: Metrics) {
    this.unsubscribe = bus.subscribe(event => {
      if (event?.scope === 'platform' && event.userId) {
        for (const client of this.platformClients) {
          if (client.data.scope === 'platform' && client.data.userId === event.userId) client.disconnect(true);
        }
      } else if (event) this.enqueue(event);
      else {
        this.enqueue({ scope: 'platform' });
        for (const client of this.server?.sockets.sockets.values() ?? []) if (client.data.schoolId) this.enqueue({ scope: 'school', schoolId: client.data.schoolId, area: 'school' });
      }
    });
  }
  afterInit(server:Server) { this.metrics.sockets.ready=true; server.engine.on('connection_error',()=>this.metrics.sockets.failures++); this.idleTimer=setInterval(()=>void this.expirePlatformSessions(),30000); this.idleTimer.unref(); }
  handleDisconnect(client:Socket) { this.platformClients.delete(client); if(client.data.monitorAccepted){this.metrics.sockets.active=Math.max(0,this.metrics.sockets.active-1);this.metrics.sockets.disconnections++;} }
  private accepted(client:Socket) {client.data.monitorAccepted=true;this.metrics.sockets.active++;this.metrics.sockets.connections++;}
  private rejected(client:Socket) {this.metrics.sockets.failures++;client.disconnect(true);}
  private enqueue(event: Invalidation) {
    const key = event.scope === 'platform' ? 'platform' : `${event.schoolId}:${event.area}`;
    // Reconcile the whole authorized current view; coalescing must not retain only
    // the last changed year when multiple years change during this window.
    const previous = this.pending.get(key);
    this.pending.set(key, event.scope === 'school' && previous?.scope === 'school' && previous.yearId !== event.yearId ? { ...event, yearId: undefined } : event);
    if (!this.timer && !this.flushing) this.timer = setTimeout(() => void this.flush(), 50);
  }
  private async flush() {
    this.timer = undefined; this.flushing = true;
    const events = [...this.pending.values()]; this.pending.clear();
    try { for (const event of events) { if (event.scope === 'platform') await this.deliverPlatform(); else await this.deliverSchool(event.schoolId, event); } }
    catch { this.metrics.sockets.processingFailures++; }
    finally { this.flushing = false; if (this.pending.size) this.timer = setTimeout(() => void this.flush(), 50); }
  }
  onModuleDestroy() { this.metrics.sockets.ready=false; this.unsubscribe(); clearTimeout(this.timer); clearInterval(this.idleTimer); this.pending.clear(); this.platformClients.clear(); }
  changed(schoolId: string, change: SchoolChange) { return this.bus.publish({ scope: 'school', schoolId, ...change }); }
  platformChanged(userId?: string) { return this.bus.publish({ scope: 'platform', ...(userId ? { userId } : {}) }); }

  async handleConnection(client: Socket) {
    if (client.handshake.auth?.scope === 'platform') {
      const request = client.request as Request;
      if (client.handshake.headers.origin !== config.APP_ORIGIN || config.NODE_ENV === 'production' && !request.secure) { this.rejected(client); return; }
      try {
        await this.platform.administrator(request);
        client.data.scope = 'platform';
        client.data.userId = request.session.userId;
        this.platformClients.add(client);
        await client.join('platform');
        this.accepted(client);
        client.emit('platform:ready');
        this.metrics.sockets.events++;
      } catch { this.rejected(client); }
      return;
    }
    const schoolId = client.handshake.auth?.schoolId;
    const request = client.request as Request;
    if (client.handshake.headers.origin !== config.APP_ORIGIN || config.NODE_ENV === 'production' && !request.secure || typeof schoolId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(schoolId)) {
      this.rejected(client); return;
    }
    try {
      const { user } = await this.platform.authorize(request, schoolId);
      client.data.schoolId = schoolId;
      client.data.userId = user.id;
      client.data.role = request.session.selectedRole;
      await client.join(`school:${schoolId}`);
      await client.join(`school:${schoolId}:role:${request.session.selectedRole}`);
      this.accepted(client);
      client.emit('school:ready');
      this.metrics.sockets.events++;
    } catch { this.rejected(client); }
  }

  private async deliverPlatform() {
    if (!this.server) return;
    for (const client of this.platformClients) {
      try {
        const request = client.request as Request;
        await new Promise<void>((resolve, reject) => request.session.reload(error => error ? reject(error) : resolve()));
        await this.platform.administrator(request);
        client.emit('platform:changed');
        this.metrics.sockets.events++;
      } catch { client.disconnect(true); }
    }
  }

  private async expirePlatformSessions() {
    if (!this.server) return;
    for (const client of this.platformClients) {
      try {
        const request = client.request as Request;
        await new Promise<void>((resolve, reject) => request.session.reload(error => error ? reject(error) : resolve()));
        await this.platform.administrator(request);
      } catch { client.disconnect(true); }
    }
  }

  private async deliverSchool(schoolId: string, change: SchoolChange) {
    if (!this.server) return;
    for (const client of this.server.sockets.sockets.values()) {
      if (client.data.schoolId !== schoolId) continue;
      try {
        const request = client.request as Request;
        await new Promise<void>((resolve, reject) => request.session.reload(error => error ? reject(error) : resolve()));
        await this.platform.authorize(request, schoolId);
        client.data.role = request.session.selectedRole;
        if (change.area === 'academic' && !['HEADMASTER','ACADEMIC','TEACHER'].includes(client.data.role)) continue;
        this.metrics.sockets.events++;
        client.emit('school:changed', { area: change.area, ...(change.yearId ? { yearId: change.yearId } : {}) });
      } catch { client.disconnect(true); }
    }
  }
}
