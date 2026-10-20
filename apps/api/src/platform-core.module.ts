import { Global, Module } from '@nestjs/common';
import { Database } from './database/database.service';
import { PlatformService } from './platform.service';
import { AuditLogService } from './audit-log.service';
@Global()
@Module({ providers: [Database, AuditLogService, PlatformService], exports: [Database, AuditLogService, PlatformService] })
export class PlatformCoreModule {
}
