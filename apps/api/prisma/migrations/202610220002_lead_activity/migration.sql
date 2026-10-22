CREATE TABLE "PlatformLeadActivity" ("id" UUID NOT NULL, "leadId" UUID NOT NULL, "actorId" UUID, "kind" TEXT NOT NULL, "note" TEXT NOT NULL DEFAULT '', "scheduledAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PlatformLeadActivity_pkey" PRIMARY KEY ("id"));
CREATE INDEX "PlatformLeadActivity_leadId_createdAt_idx" ON "PlatformLeadActivity"("leadId", "createdAt");
ALTER TABLE "PlatformLeadActivity" ADD CONSTRAINT "PlatformLeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "PlatformLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
