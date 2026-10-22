ALTER TABLE "PlatformLead" ADD COLUMN "region" TEXT NOT NULL DEFAULT '', ADD COLUMN "schoolType" TEXT NOT NULL DEFAULT '', ADD COLUMN "schoolWebsite" TEXT NOT NULL DEFAULT '', ADD COLUMN "applicantPosition" TEXT NOT NULL DEFAULT '', ADD COLUMN "headmasterName" TEXT NOT NULL DEFAULT '', ADD COLUMN "headmasterEmail" TEXT NOT NULL DEFAULT '', ADD COLUMN "headmasterPhone" TEXT NOT NULL DEFAULT '', ADD COLUMN "preferredDemoMethod" TEXT NOT NULL DEFAULT '', ADD COLUMN "requestMessage" TEXT NOT NULL DEFAULT '';
CREATE INDEX "PlatformLead_source_createdAt_idx" ON "PlatformLead"("source", "createdAt");
CREATE INDEX "PlatformLead_contactEmail_createdAt_idx" ON "PlatformLead"("contactEmail", "createdAt");
CREATE INDEX "PlatformLead_convertedSchoolId_idx" ON "PlatformLead"("convertedSchoolId");
CREATE TABLE "PublicFormAttempt" ("id" UUID NOT NULL, "form" TEXT NOT NULL, "emailHash" TEXT NOT NULL, "ipHash" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PublicFormAttempt_pkey" PRIMARY KEY ("id"));
CREATE INDEX "PublicFormAttempt_form_emailHash_createdAt_idx" ON "PublicFormAttempt"("form", "emailHash", "createdAt");
CREATE INDEX "PublicFormAttempt_ipHash_createdAt_idx" ON "PublicFormAttempt"("ipHash", "createdAt");
CREATE TABLE "PublicFormBlock" ("ipHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PublicFormBlock_pkey" PRIMARY KEY ("ipHash"));
