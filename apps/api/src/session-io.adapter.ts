import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { RequestHandler } from 'express';
import { Server, ServerOptions } from 'socket.io';

export class SessionIoAdapter extends IoAdapter {
  constructor(app: INestApplication, private readonly sessionMiddleware: RequestHandler) { super(app); }
  override createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;
    server.engine.use(this.sessionMiddleware);
    return server;
  }
}
