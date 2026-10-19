-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('SMS', 'WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'ENROUTE', 'ACCEPTED', 'DELIVERED', 'READ', 'FAILED', 'REJECTED', 'UNDELIVERABLE', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "AcademicWorkspace" DROP CONSTRAINT "AcademicWorkspace_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "AcademicWorkspace" DROP CONSTRAINT "AcademicWorkspace_yearId_fkey";

-- DropForeignKey
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_studentId_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "PlatformLead" DROP CONSTRAINT "PlatformLead_convertedSchoolId_fkey";

-- AlterTable
ALTER TABLE "Outbox" ADD COLUMN     "channel" "CommunicationChannel",
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "schoolId" UUID;

-- AlterTable
ALTER TABLE "PlatformLead" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PlatformSetting" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Guardian" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "userId" UUID,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsappPhone" TEXT,
    "email" TEXT,
    "preferredChannel" "CommunicationChannel" NOT NULL DEFAULT 'SMS',
    "preferredLanguage" TEXT NOT NULL DEFAULT 'sw',
    "phoneVerifiedAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "whatsappVerifiedAt" TIMESTAMP(3),
    "optOutSms" BOOLEAN NOT NULL DEFAULT false,
    "optOutWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentGuardian" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "guardianId" UUID NOT NULL,
    "relationship" TEXT NOT NULL DEFAULT 'Guardian',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "canReceiveReports" BOOLEAN NOT NULL DEFAULT true,
    "canReceiveFinanceAlert" BOOLEAN NOT NULL DEFAULT true,
    "canReceiveAttendanceAlert" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentGuardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactVerification" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "guardianId" UUID NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "destination" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "resendAfter" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportAccessLink" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "guardianId" UUID NOT NULL,
    "reportCardId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" UUID,
    "revokeReason" TEXT,
    "maxAccessCount" INTEGER NOT NULL DEFAULT 25,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),
    "verificationType" TEXT NOT NULL DEFAULT 'phone_last4',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportAccessLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationLog" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "guardianId" UUID,
    "studentId" UUID,
    "channel" "CommunicationChannel" NOT NULL,
    "providerName" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "recipient" TEXT NOT NULL,
    "templateKey" TEXT,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "unitCostTzs" INTEGER NOT NULL DEFAULT 0,
    "segments" INTEGER NOT NULL DEFAULT 1,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,

    CONSTRAINT "CommunicationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Guardian_schoolId_userId_idx" ON "Guardian"("schoolId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Guardian_id_schoolId_key" ON "Guardian"("id", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Guardian_schoolId_phone_key" ON "Guardian"("schoolId", "phone");

-- CreateIndex
CREATE INDEX "StudentGuardian_schoolId_studentId_idx" ON "StudentGuardian"("schoolId", "studentId");

-- CreateIndex
CREATE INDEX "StudentGuardian_schoolId_guardianId_idx" ON "StudentGuardian"("schoolId", "guardianId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentGuardian_studentId_guardianId_key" ON "StudentGuardian"("studentId", "guardianId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentGuardian_id_schoolId_key" ON "StudentGuardian"("id", "schoolId");

-- CreateIndex
CREATE INDEX "ContactVerification_schoolId_guardianId_channel_idx" ON "ContactVerification"("schoolId", "guardianId", "channel");

-- CreateIndex
CREATE INDEX "ContactVerification_destination_expiresAt_idx" ON "ContactVerification"("destination", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReportAccessLink_tokenHash_key" ON "ReportAccessLink"("tokenHash");

-- CreateIndex
CREATE INDEX "ReportAccessLink_schoolId_studentId_idx" ON "ReportAccessLink"("schoolId", "studentId");

-- CreateIndex
CREATE INDEX "ReportAccessLink_schoolId_guardianId_idx" ON "ReportAccessLink"("schoolId", "guardianId");

-- CreateIndex
CREATE INDEX "ReportAccessLink_expiresAt_idx" ON "ReportAccessLink"("expiresAt");

-- CreateIndex
CREATE INDEX "CommunicationLog_schoolId_sentAt_idx" ON "CommunicationLog"("schoolId", "sentAt");

-- CreateIndex
CREATE INDEX "CommunicationLog_providerMessageId_idx" ON "CommunicationLog"("providerMessageId");

-- CreateIndex
CREATE INDEX "CommunicationLog_schoolId_guardianId_idx" ON "CommunicationLog"("schoolId", "guardianId");

-- CreateIndex
CREATE INDEX "Outbox_schoolId_createdAt_idx" ON "Outbox"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "Outbox_idempotencyKey_idx" ON "Outbox"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "PlatformLead" ADD CONSTRAINT "PlatformLead_convertedSchoolId_fkey" FOREIGN KEY ("convertedSchoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_studentId_schoolId_fkey" FOREIGN KEY ("studentId", "schoolId") REFERENCES "Student"("id", "schoolId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicWorkspace" ADD CONSTRAINT "AcademicWorkspace_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicWorkspace" ADD CONSTRAINT "AcademicWorkspace_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guardian" ADD CONSTRAINT "Guardian_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guardian" ADD CONSTRAINT "Guardian_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGuardian" ADD CONSTRAINT "StudentGuardian_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGuardian" ADD CONSTRAINT "StudentGuardian_studentId_schoolId_fkey" FOREIGN KEY ("studentId", "schoolId") REFERENCES "Student"("id", "schoolId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGuardian" ADD CONSTRAINT "StudentGuardian_guardianId_schoolId_fkey" FOREIGN KEY ("guardianId", "schoolId") REFERENCES "Guardian"("id", "schoolId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactVerification" ADD CONSTRAINT "ContactVerification_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactVerification" ADD CONSTRAINT "ContactVerification_guardianId_schoolId_fkey" FOREIGN KEY ("guardianId", "schoolId") REFERENCES "Guardian"("id", "schoolId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAccessLink" ADD CONSTRAINT "ReportAccessLink_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAccessLink" ADD CONSTRAINT "ReportAccessLink_studentId_schoolId_fkey" FOREIGN KEY ("studentId", "schoolId") REFERENCES "Student"("id", "schoolId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAccessLink" ADD CONSTRAINT "ReportAccessLink_guardianId_schoolId_fkey" FOREIGN KEY ("guardianId", "schoolId") REFERENCES "Guardian"("id", "schoolId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_guardianId_schoolId_fkey" FOREIGN KEY ("guardianId", "schoolId") REFERENCES "Guardian"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;
