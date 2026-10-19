import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { RegistryController } from './registry.controller';
import { RegistryWorkflowsController } from './registry-workflows.controller';
import { AcademicController } from './academic.controller';
import { BursarController } from './bursar.controller';
import { GuardianController } from './guardian.controller';
import { WebhookController } from './webhook.controller';
import { ReportAccessController } from './report-access.controller';
import { Database } from './database/database.service';
import { PlatformService } from './platform.service';
import { CommunicationService } from './communication/communication.service';
import { RealtimeBus } from './realtime-bus';
import { RealtimeGateway } from './realtime.gateway';
@Module({ 
  controllers: [ApiController, RegistryController, RegistryWorkflowsController, BursarController, AcademicController, GuardianController, WebhookController, ReportAccessController], 
  providers: [Database, PlatformService, CommunicationService, RealtimeBus, RealtimeGateway] 
})
export class AppModule {}
