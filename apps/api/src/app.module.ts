import { MonitoringModule } from './monitoring/monitoring.module';
import { PlatformCoreModule } from './platform-core.module';
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
import { CommunicationService } from './communication/communication.service';
import { ReportAccessVerificationService } from './report-access-verification.service';
import { SubscriptionService } from './subscription.service';
import { WalletService } from './wallet.service';
import { ReconciliationService } from './reconciliation.service';
import { SecurityEventsService } from './security-events.service';
import { RealtimeGateway } from './realtime.gateway';
import { ParentController } from './parent.controller';

@Module({
  imports: [PlatformCoreModule, MonitoringModule],
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
    ParentController,
  ],
  providers: [
    CommunicationService,
    ReportAccessVerificationService,
    SubscriptionService,
    WalletService,
    ReconciliationService,
    SecurityEventsService,
    RealtimeGateway,
  ]
})
export class AppModule {}
