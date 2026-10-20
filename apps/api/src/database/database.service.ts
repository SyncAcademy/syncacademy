import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
@Injectable()
export class Database extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  operationFailures=0;
  constructor(){super({log:[{emit:'event',level:'error'}]});(this as any).$on('error',()=>this.operationFailures++);}
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
