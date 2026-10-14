import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';

export interface SchoolChange { schoolId: string; area: 'academic' | 'school'; yearId?: string; sequence: number }

@Injectable({ providedIn: 'root' })
export class SchoolRealtimeService {
  readonly change = signal<SchoolChange | null>(null);
  private socket: Socket | null = null;
  private schoolId = '';
  private identityKey = '';
  private sequence = 0;

  select(schoolId: string, identityKey = '') {
    if (this.schoolId === schoolId && this.identityKey === identityKey && this.socket) return;
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.change.set(null);
    this.schoolId = schoolId;
    this.identityKey = identityKey;
    if (!schoolId) return;
    const socket = io({ path: '/socket.io', transports: ['websocket'], withCredentials: true, autoConnect: false, auth: { schoolId } });
    let wasReady = false;
    socket.on('school:ready', () => {
      if(this.socket!==socket)return;
      if (wasReady) this.change.set({ schoolId, area: 'school', sequence: ++this.sequence });
      wasReady = true;
    });
    socket.on('school:changed', (event: { area?: unknown; yearId?: unknown }) => {
      if (this.socket !== socket || (event?.area !== 'academic' && event?.area !== 'school')) return;
      this.change.set({ schoolId, area: event.area, yearId: typeof event.yearId === 'string' ? event.yearId : undefined, sequence: ++this.sequence });
    });
    this.socket = socket;
    socket.connect();
  }
}
