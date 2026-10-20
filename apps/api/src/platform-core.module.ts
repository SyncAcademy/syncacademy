import { Global, Module } from '@nestjs/common';
import { Database } from './database/database.service';
import { PlatformService } from './platform.service';
@Global()
@Module({ providers: [Database, PlatformService], exports: [Database, PlatformService] })
export class PlatformCoreModule {
}
