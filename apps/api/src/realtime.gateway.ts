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
  private timer?: NodeJS.Timeout;
  private flushing = false;
  private readonly unsubscribe: () => void;
  constructor(private readonly platform: PlatformService, private readonly bus: RealtimeBus, private readonly metrics: Metrics) {
    this.unsubscribe = bus.subscribe(event => {
      if (event) this.enqueue(event);
      else {
        this.enqueue({ scope: 'platform' });
        for (const client of this.server?.sockets.sockets.values() ?? []) if (client.data.schoolId) this.enqueue({ scope: 'school', schoolId: client.data.schoolId, area: 'school' });
      }
    });
  }
  afterInit(server:Server) { this.metrics.sockets.ready=true; server.engine.on('connection_error',()=>this.metrics.sockets.failures++); }
  handleDisconnect(client:Socket) { if(client.data.monitorAccepted){this.metrics.sockets.active=Math.max(0,this.metrics.sockets.active-1);this.metrics.sockets.disconnections++;} }
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
  onModuleDestroy() { this.metrics.sockets.ready=false; this.unsubscribe(); clearTimeout(this.timer); this.pending.clear(); }
  changed(schoolId: string, change: SchoolChange) { return this.bus.publish({ scope: 'school', schoolId, ...change }); }
  platformChanged() { return this.bus.publish({ scope: 'platform' }); }

  async handleConnection(client: Socket) {
    if (client.handshake.auth?.scope === 'platform') {
      if (client.handshake.headers.origin !== config.APP_ORIGIN) { this.rejected(client); return; }
      try {
        await this.platform.administrator(client.request as Request);
        client.data.scope = 'platform';
        await client.join('platform');
        this.accepted(client);
        client.emit('platform:ready');
        this.metrics.sockets.events++;
      } catch { this.rejected(client); }
      return;
    }
    const schoolId = client.handshake.auth?.schoolId;
    if (client.handshake.headers.origin !== config.APP_ORIGIN || typeof schoolId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(schoolId)) {
      this.rejected(client); return;
    }
    try {
      const request = client.request as Request;
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
    for (const client of this.server.sockets.sockets.values()) {
      if (client.data.scope !== 'platform') continue;
      try {
        const request = client.request as Request;
        await new Promise<void>((resolve, reject) => request.session.reload(error => error ? reject(error) : resolve()));
        await this.platform.administrator(request);
        client.emit('platform:changed');
        this.metrics.sockets.events++;
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
