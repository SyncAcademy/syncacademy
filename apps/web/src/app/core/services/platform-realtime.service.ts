import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class PlatformRealtimeService {
  readonly revision = signal(0);
  private socket: Socket | null = null;
  private identity = '';
  select(identity: string) {
    if (identity === this.identity && this.socket) return;
    this.socket?.removeAllListeners(); this.socket?.disconnect(); this.socket = null;
    this.identity = identity;
    if (!identity) return;
    const socket = io({ path: '/socket.io', transports: ['websocket'], withCredentials: true, autoConnect: false, auth: { scope: 'platform' } });
    const reconcile = () => { if (this.socket === socket) this.revision.update(value => value + 1); };
    socket.on('platform:ready', reconcile);
    socket.on('platform:changed', reconcile);
    this.socket = socket; socket.connect();
  }
}
