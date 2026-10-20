import { Global, Module } from '@nestjs/common';
import { PlatformCoreModule } from '../platform-core.module';
import { Metrics } from './metrics';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
@Global()
@Module({ imports: [PlatformCoreModule], controllers: [MonitoringController], providers: [Metrics, MonitoringService], exports: [Metrics] })
export class MonitoringModule {
}
