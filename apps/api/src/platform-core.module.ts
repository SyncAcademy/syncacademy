import { Global, Module } from '@nestjs/common';
import { Database } from './database/database.service';
import { PlatformService } from './platform.service';
import { AuditLogService } from './audit-log.service';
import { PublicFormProtectionService } from './public-form-protection.service';
import { RealtimeBus } from './realtime-bus';
@Global()
@Module({ providers: [Database, AuditLogService, RealtimeBus, PlatformService, PublicFormProtectionService], exports: [Database, AuditLogService, RealtimeBus, PlatformService, PublicFormProtectionService] })
export class PlatformCoreModule {
}
