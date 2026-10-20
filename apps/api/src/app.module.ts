import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { RegistryController } from './registry.controller';
import { RegistryWorkflowsController } from './registry-workflows.controller';
import { AcademicController } from './academic.controller';
import { BursarController } from './bursar.controller';
import { GuardianController } from './guardian.controller';
import { WebhookController } from './webhook.controller';
import { ReportAccessController } from './report-access.controller';
import { RosterConfirmationController } from './roster-confirmation.controller';
import { SubscriptionController } from './subscription.controller';
import { WalletController } from './wallet.controller';
import { ReconciliationController } from './reconciliation.controller';
import { SecurityEventsController } from './security-events.controller';
import { Database } from './database/database.service';
import { PlatformService } from './platform.service';
import { CommunicationService } from './communication/communication.service';
import { SubscriptionService } from './subscription.service';
import { WalletService } from './wallet.service';
import { ReconciliationService } from './reconciliation.service';
import { SecurityEventsService } from './security-events.service';
import { RealtimeBus } from './realtime-bus';
import { RealtimeGateway } from './realtime.gateway';

@Module({ 
  controllers: [
    ApiController, 
    RegistryController, 
    RegistryWorkflowsController, 
    BursarController, 
    AcademicController, 
    GuardianController, 
    WebhookController, 
    ReportAccessController,
    RosterConfirmationController,
    SubscriptionController,
    WalletController,
    ReconciliationController,
    SecurityEventsController,
  ], 
  providers: [
    Database, 
    PlatformService, 
    CommunicationService, 
    SubscriptionService,
    WalletService,
    ReconciliationService,
    SecurityEventsService,
    RealtimeBus, 
    RealtimeGateway,
  ] 
})
export class AppModule {}
