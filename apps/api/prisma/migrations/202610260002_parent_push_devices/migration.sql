ALTER TYPE "CommunicationChannel" ADD VALUE IF NOT EXISTS 'PUSH';

CREATE TABLE "ParentPushDevice" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "sessionId" UUID NOT NULL,
  "installationId" TEXT NOT NULL,
  "fidHash" TEXT NOT NULL,
  "fidEncrypted" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "sound" BOOLEAN NOT NULL DEFAULT true,
  "vibration" BOOLEAN NOT NULL DEFAULT true,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParentPushDevice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ParentPushDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ParentPushDevice_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ParentMobileSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ParentPushDevice_installationId_key" ON "ParentPushDevice"("installationId");
CREATE UNIQUE INDEX "ParentPushDevice_fidHash_key" ON "ParentPushDevice"("fidHash");
CREATE INDEX "ParentPushDevice_userId_revokedAt_enabled_idx" ON "ParentPushDevice"("userId", "revokedAt", "enabled");
CREATE INDEX "ParentPushDevice_sessionId_revokedAt_idx" ON "ParentPushDevice"("sessionId", "revokedAt");
CREATE UNIQUE INDEX "Outbox_parent_push_idempotency_key" ON "Outbox"("idempotencyKey") WHERE "idempotencyKey" LIKE 'parent-push:%';
