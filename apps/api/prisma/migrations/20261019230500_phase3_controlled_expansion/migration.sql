-- AlterTable
ALTER TABLE "ReportAccessLink" ADD COLUMN     "lastOtpSentAt" TIMESTAMP(3),
ADD COLUMN     "otpChallengeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sessionTokenHash" TEXT,
ALTER COLUMN "verificationType" SET DEFAULT 'otp_challenge';

-- AlterTable
ALTER TABLE "StudentGuardian" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "RosterConfirmation" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "classroomId" UUID NOT NULL,
    "yearId" UUID NOT NULL,
    "teacherMembershipId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT NOT NULL DEFAULT '',
    "flagReason" TEXT,
    "flaggedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RosterConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL DEFAULT 'annual',
    "priceAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "maxStudents" INTEGER NOT NULL DEFAULT 500,
    "features" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolSubscription" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'trial',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "gracePeriodEndsAt" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionInvoice" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "status" TEXT NOT NULL DEFAULT 'issued',
    "billingPeriodStart" TIMESTAMP(3) NOT NULL,
    "billingPeriodEnd" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paymentReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPayment" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "providerReference" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "idempotencyKey" TEXT,
    "paidAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolCreditWallet" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "smsBalance" INTEGER NOT NULL DEFAULT 0,
    "whatsappBalance" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolCreditWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditPackage" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "smsUnits" INTEGER NOT NULL DEFAULT 0,
    "whatsappUnits" INTEGER NOT NULL DEFAULT 0,
    "priceAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditPurchaseInvoice" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "packageId" UUID NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "smsUnits" INTEGER NOT NULL,
    "whatsappUnits" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentProvider" TEXT NOT NULL DEFAULT 'mock',
    "paymentReference" TEXT,
    "idempotencyKey" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditPurchaseInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditLedger" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "type" TEXT NOT NULL,
    "units" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "actorId" UUID,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankStatement" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL DEFAULT '',
    "statementDate" DATE NOT NULL,
    "startDate" DATE,
    "endDate" DATE,
    "totalCredits" INTEGER NOT NULL DEFAULT 0,
    "totalDebits" INTEGER NOT NULL DEFAULT 0,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "fileName" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "uploadedById" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankStatementRow" (
    "id" UUID NOT NULL,
    "statementId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "transactionDate" DATE NOT NULL,
    "reference" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "payerName" TEXT NOT NULL DEFAULT '',
    "matchStatus" TEXT NOT NULL DEFAULT 'unmatched',
    "matchedPaymentId" UUID,
    "reconciledAt" TIMESTAMP(3),
    "reconciledById" UUID,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "BankStatementRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationMatch" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "statementRowId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "matchType" TEXT NOT NULL,
    "confidenceScore" INTEGER NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'suggested',
    "reconciledById" UUID,
    "reconciledAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" UUID NOT NULL,
    "schoolId" UUID,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "eventType" TEXT NOT NULL,
    "actorId" UUID,
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "details" JSONB NOT NULL DEFAULT '{}',
    "investigationStatus" TEXT NOT NULL DEFAULT 'unreviewed',
    "resolutionNotes" TEXT NOT NULL DEFAULT '',
    "resolvedById" UUID,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RosterConfirmation_schoolId_classroomId_status_idx" ON "RosterConfirmation"("schoolId", "classroomId", "status");

-- CreateIndex
CREATE INDEX "RosterConfirmation_schoolId_studentId_idx" ON "RosterConfirmation"("schoolId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "RosterConfirmation_enrollmentId_teacherMembershipId_key" ON "RosterConfirmation"("enrollmentId", "teacherMembershipId");

-- CreateIndex
CREATE UNIQUE INDEX "RosterConfirmation_id_schoolId_key" ON "RosterConfirmation"("id", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");

-- CreateIndex
CREATE INDEX "SchoolSubscription_schoolId_status_idx" ON "SchoolSubscription"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolSubscription_id_schoolId_key" ON "SchoolSubscription"("id", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionInvoice_invoiceNumber_key" ON "SubscriptionInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_schoolId_status_idx" ON "SubscriptionInvoice"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionInvoice_id_schoolId_key" ON "SubscriptionInvoice"("id", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionInvoice_schoolId_billingPeriodStart_billingPeri_key" ON "SubscriptionInvoice"("schoolId", "billingPeriodStart", "billingPeriodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_idempotencyKey_key" ON "SubscriptionPayment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_schoolId_invoiceId_idx" ON "SubscriptionPayment"("schoolId", "invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_id_schoolId_key" ON "SubscriptionPayment"("id", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolCreditWallet_schoolId_key" ON "SchoolCreditWallet"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolCreditWallet_id_schoolId_key" ON "SchoolCreditWallet"("id", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditPackage_code_key" ON "CreditPackage"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CreditPurchaseInvoice_invoiceNumber_key" ON "CreditPurchaseInvoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CreditPurchaseInvoice_idempotencyKey_key" ON "CreditPurchaseInvoice"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CreditPurchaseInvoice_schoolId_status_idx" ON "CreditPurchaseInvoice"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CreditPurchaseInvoice_id_schoolId_key" ON "CreditPurchaseInvoice"("id", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditLedger_idempotencyKey_key" ON "CreditLedger"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CreditLedger_schoolId_channel_createdAt_idx" ON "CreditLedger"("schoolId", "channel", "createdAt");

-- CreateIndex
CREATE INDEX "CreditLedger_referenceId_referenceType_idx" ON "CreditLedger"("referenceId", "referenceType");

-- CreateIndex
CREATE UNIQUE INDEX "CreditLedger_id_schoolId_key" ON "CreditLedger"("id", "schoolId");

-- CreateIndex
CREATE INDEX "BankStatement_schoolId_statementDate_idx" ON "BankStatement"("schoolId", "statementDate");

-- CreateIndex
CREATE UNIQUE INDEX "BankStatement_id_schoolId_key" ON "BankStatement"("id", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "BankStatement_schoolId_fileHash_key" ON "BankStatement"("schoolId", "fileHash");

-- CreateIndex
CREATE INDEX "BankStatementRow_schoolId_matchStatus_idx" ON "BankStatementRow"("schoolId", "matchStatus");

-- CreateIndex
CREATE INDEX "BankStatementRow_schoolId_reference_idx" ON "BankStatementRow"("schoolId", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "BankStatementRow_id_schoolId_key" ON "BankStatementRow"("id", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "BankStatementRow_statementId_rowNumber_key" ON "BankStatementRow"("statementId", "rowNumber");

-- CreateIndex
CREATE INDEX "ReconciliationMatch_schoolId_status_idx" ON "ReconciliationMatch"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReconciliationMatch_id_schoolId_key" ON "ReconciliationMatch"("id", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "ReconciliationMatch_statementRowId_paymentId_key" ON "ReconciliationMatch"("statementRowId", "paymentId");

-- CreateIndex
CREATE INDEX "SecurityEvent_schoolId_createdAt_idx" ON "SecurityEvent"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_category_severity_idx" ON "SecurityEvent"("category", "severity");

-- CreateIndex
CREATE INDEX "SecurityEvent_investigationStatus_idx" ON "SecurityEvent"("investigationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_id_schoolId_key" ON "Payment"("id", "schoolId");

-- CreateIndex
CREATE INDEX "ReportAccessLink_sessionTokenHash_idx" ON "ReportAccessLink"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "StudentGuardian_schoolId_active_idx" ON "StudentGuardian"("schoolId", "active");

-- AddForeignKey
ALTER TABLE "RosterConfirmation" ADD CONSTRAINT "RosterConfirmation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterConfirmation" ADD CONSTRAINT "RosterConfirmation_enrollmentId_schoolId_fkey" FOREIGN KEY ("enrollmentId", "schoolId") REFERENCES "Enrollment"("id", "schoolId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterConfirmation" ADD CONSTRAINT "RosterConfirmation_studentId_schoolId_fkey" FOREIGN KEY ("studentId", "schoolId") REFERENCES "Student"("id", "schoolId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterConfirmation" ADD CONSTRAINT "RosterConfirmation_classroomId_schoolId_fkey" FOREIGN KEY ("classroomId", "schoolId") REFERENCES "Classroom"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterConfirmation" ADD CONSTRAINT "RosterConfirmation_yearId_schoolId_fkey" FOREIGN KEY ("yearId", "schoolId") REFERENCES "AcademicYear"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterConfirmation" ADD CONSTRAINT "RosterConfirmation_teacherMembershipId_schoolId_fkey" FOREIGN KEY ("teacherMembershipId", "schoolId") REFERENCES "Membership"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolSubscription" ADD CONSTRAINT "SchoolSubscription_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolSubscription" ADD CONSTRAINT "SchoolSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_subscriptionId_schoolId_fkey" FOREIGN KEY ("subscriptionId", "schoolId") REFERENCES "SchoolSubscription"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_invoiceId_schoolId_fkey" FOREIGN KEY ("invoiceId", "schoolId") REFERENCES "SubscriptionInvoice"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolCreditWallet" ADD CONSTRAINT "SchoolCreditWallet_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditPurchaseInvoice" ADD CONSTRAINT "CreditPurchaseInvoice_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditPurchaseInvoice" ADD CONSTRAINT "CreditPurchaseInvoice_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CreditPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLedger" ADD CONSTRAINT "CreditLedger_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLedger" ADD CONSTRAINT "CreditLedger_walletId_schoolId_fkey" FOREIGN KEY ("walletId", "schoolId") REFERENCES "SchoolCreditWallet"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementRow" ADD CONSTRAINT "BankStatementRow_statementId_schoolId_fkey" FOREIGN KEY ("statementId", "schoolId") REFERENCES "BankStatement"("id", "schoolId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementRow" ADD CONSTRAINT "BankStatementRow_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationMatch" ADD CONSTRAINT "ReconciliationMatch_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationMatch" ADD CONSTRAINT "ReconciliationMatch_statementRowId_schoolId_fkey" FOREIGN KEY ("statementRowId", "schoolId") REFERENCES "BankStatementRow"("id", "schoolId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationMatch" ADD CONSTRAINT "ReconciliationMatch_paymentId_schoolId_fkey" FOREIGN KEY ("paymentId", "schoolId") REFERENCES "Payment"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

