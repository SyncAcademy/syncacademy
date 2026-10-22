import { Global, Module } from '@nestjs/common';
import { Database } from './database/database.service';
import { PlatformService } from './platform.service';
import { AuditLogService } from './audit-log.service';
import { PublicFormProtectionService } from './public-form-protection.service';
@Global()
@Module({ providers: [Database, AuditLogService, PlatformService, PublicFormProtectionService], exports: [Database, AuditLogService, PlatformService, PublicFormProtectionService] })
export class PlatformCoreModule {
}
