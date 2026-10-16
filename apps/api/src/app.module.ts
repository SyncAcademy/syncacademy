import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { RegistryController } from './registry.controller';
import { RegistryWorkflowsController } from './registry-workflows.controller';
import { AcademicController } from './academic.controller';
import { BursarController } from './bursar.controller';
import { Database } from './database/database.service';
import { PlatformService } from './platform.service';
import { RealtimeBus } from './realtime-bus';
import { RealtimeGateway } from './realtime.gateway';
@Module({ controllers: [ApiController, RegistryController, RegistryWorkflowsController, BursarController, AcademicController], providers: [Database, PlatformService, RealtimeBus, RealtimeGateway] })
export class AppModule {}
