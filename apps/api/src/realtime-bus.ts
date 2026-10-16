import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Client } from 'pg';
import { randomUUID } from 'node:crypto';
import { config } from './config';
import { Database } from './database/database.service';

export type Invalidation = { scope: 'platform' } | { scope: 'school'; schoolId: string; area: 'school' | 'academic'; yearId?: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Metadata-only application event adapter. Each instance reauthorizes local sockets.
 * LISTEN is not durable: reconnect triggers reconciliation and clients also poll.
 */
@Injectable()
export class RealtimeBus implements OnModuleInit, OnModuleDestroy {
  private readonly instance = randomUUID();
  private client: Client | null = null;
  private retry?: NodeJS.Timeout;
  private stopped = false;
  private backoff = 1000;
  private listeners = new Set<(event: Invalidation | null) => void>();
  constructor(private readonly db: Database) {}
  subscribe(listener: (event: Invalidation | null) => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private deliver(event: Invalidation | null) { for (const listener of this.listeners) listener(event); }
  async publish(event: Invalidation) {
    this.deliver(event);
    if (config.REALTIME_TRANSPORT === 'postgres') {
      const payload = JSON.stringify({ instance: this.instance, event });
      try { await this.db.$queryRaw`SELECT pg_notify('syncacademy_changes', ${payload})::text`; }
      catch { console.error(JSON.stringify({ event: 'realtime_publish_failed' })); }
    }
  }
  async onModuleInit() { if (config.REALTIME_TRANSPORT === 'postgres') await this.connect(); }
  private async connect() {
    if (this.stopped) return;
    const client = new Client({ connectionString: config.REALTIME_DATABASE_URL ?? config.DATABASE_URL, connectionTimeoutMillis: 5000, application_name: 'syncacademy-realtime' });
    this.client = client;
    const failed = () => {
      if (this.client !== client || this.stopped) return;
      this.client = null;
      void client.end().catch(() => {});
      console.error(JSON.stringify({ event: 'realtime_listener_disconnected' }));
      this.retry = setTimeout(() => void this.connect(), this.backoff);
      this.retry.unref(); this.backoff = Math.min(this.backoff * 2, 30000);
    };
    client.on('error', failed); client.on('end', failed);
    client.on('notification', message => {
      if (this.client !== client || message.channel !== 'syncacademy_changes' || !message.payload || message.payload.length > 1024) return;
      try {
        const payload = JSON.parse(message.payload), event = payload.event;
        if (payload.instance === this.instance) return;
        if (event?.scope === 'platform') this.deliver({ scope: 'platform' });
        else if (event?.scope === 'school' && typeof event.schoolId === 'string' && uuid.test(event.schoolId) && ['school','academic'].includes(event.area)
          && (event.yearId === undefined || typeof event.yearId === 'string' && uuid.test(event.yearId))) {
          this.deliver({ scope: 'school', schoolId: event.schoolId, area: event.area, yearId: event.yearId });
        }
      } catch { /* Invalid metadata never reaches sockets. */ }
    });
    try {
      await client.connect(); await client.query('LISTEN syncacademy_changes');
      if (this.client !== client || this.stopped) return;
      this.backoff = 1000;
      this.deliver(null); // LISTEN is active; reconcile changes missed during downtime.
    } catch { failed(); }
  }
  async onModuleDestroy() { this.stopped = true; clearTimeout(this.retry); const client = this.client; this.client = null; if (client) await client.end().catch(() => {}); }
}
