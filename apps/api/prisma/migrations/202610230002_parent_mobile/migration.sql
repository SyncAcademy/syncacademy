CREATE TABLE "ParentAccount" (
    "userId" UUID NOT NULL,
    "loginPhone" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParentAccount_pkey" PRIMARY KEY ("userId")
);
CREATE UNIQUE INDEX "ParentAccount_loginPhone_key" ON "ParentAccount"("loginPhone");
ALTER TABLE "ParentAccount" ADD CONSTRAINT "ParentAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ParentInvitation" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "guardianId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "destination" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitedBy" UUID NOT NULL,
    CONSTRAINT "ParentInvitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ParentInvitation_tokenHash_key" ON "ParentInvitation"("tokenHash");
CREATE UNIQUE INDEX "ParentInvitation_codeHash_key" ON "ParentInvitation"("codeHash");
CREATE INDEX "ParentInvitation_schoolId_guardianId_consumedAt_revokedAt_expiresAt_idx" ON "ParentInvitation"("schoolId", "guardianId", "consumedAt", "revokedAt", "expiresAt");
CREATE INDEX "ParentInvitation_schoolId_createdAt_id_idx" ON "ParentInvitation"("schoolId", "createdAt", "id");
ALTER TABLE "ParentInvitation" ADD CONSTRAINT "ParentInvitation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentInvitation" ADD CONSTRAINT "ParentInvitation_guardianId_schoolId_fkey" FOREIGN KEY ("guardianId", "schoolId") REFERENCES "Guardian"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ParentMobileSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParentMobileSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ParentMobileSession_tokenHash_key" ON "ParentMobileSession"("tokenHash");
CREATE INDEX "ParentMobileSession_userId_revokedAt_expiresAt_idx" ON "ParentMobileSession"("userId", "revokedAt", "expiresAt");
ALTER TABLE "ParentMobileSession" ADD CONSTRAINT "ParentMobileSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ParentNotification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "studentId" UUID,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "targetId" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    CONSTRAINT "ParentNotification_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ParentNotification_dedupeKey_key" ON "ParentNotification"("dedupeKey");
CREATE INDEX "ParentNotification_userId_createdAt_id_idx" ON "ParentNotification"("userId", "createdAt", "id");
CREATE INDEX "ParentNotification_userId_readAt_idx" ON "ParentNotification"("userId", "readAt");
CREATE INDEX "ParentNotification_schoolId_studentId_idx" ON "ParentNotification"("schoolId", "studentId");
ALTER TABLE "ParentNotification" ADD CONSTRAINT "ParentNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentNotification" ADD CONSTRAINT "ParentNotification_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ParentInvitationBatch" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "yearId" UUID NOT NULL,
    "classId" UUID,
    "selectedStudentIds" JSONB,
    "channel" "CommunicationChannel" NOT NULL,
    "requestedBy" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "cursor" UUID,
    "scanned" INTEGER NOT NULL DEFAULT 0,
    "queued" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "leaseId" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "ParentInvitationBatch_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ParentInvitationBatch_status_leaseUntil_createdAt_idx" ON "ParentInvitationBatch"("status", "leaseUntil", "createdAt");
CREATE INDEX "ParentInvitationBatch_schoolId_createdAt_id_idx" ON "ParentInvitationBatch"("schoolId", "createdAt", "id");
ALTER TABLE "ParentInvitationBatch" ADD CONSTRAINT "ParentInvitationBatch_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ParentAnnouncement" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "yearId" UUID NOT NULL,
    "classId" UUID,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notificationCursor" UUID,
    "notificationCompleteAt" TIMESTAMP(3),
    "leaseId" TEXT,
    "leaseUntil" TIMESTAMP(3),
    CONSTRAINT "ParentAnnouncement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ParentAnnouncement_schoolId_publishedAt_id_idx" ON "ParentAnnouncement"("schoolId", "publishedAt", "id");
CREATE INDEX "ParentAnnouncement_schoolId_classId_publishedAt_idx" ON "ParentAnnouncement"("schoolId", "classId", "publishedAt");
CREATE INDEX "ParentAnnouncement_notificationCompleteAt_leaseUntil_createdAt_idx" ON "ParentAnnouncement"("notificationCompleteAt", "leaseUntil", "createdAt");
ALTER TABLE "ParentAnnouncement" ADD CONSTRAINT "ParentAnnouncement_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ParentRecoveryChallenge" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "guardianId" UUID NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "destination" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParentRecoveryChallenge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ParentRecoveryChallenge_userId_usedAt_createdAt_idx" ON "ParentRecoveryChallenge"("userId", "usedAt", "createdAt");
CREATE INDEX "ParentRecoveryChallenge_expiresAt_idx" ON "ParentRecoveryChallenge"("expiresAt");
ALTER TABLE "ParentRecoveryChallenge" ADD CONSTRAINT "ParentRecoveryChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentRecoveryChallenge" ADD CONSTRAINT "ParentRecoveryChallenge_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentRecoveryChallenge" ADD CONSTRAINT "ParentRecoveryChallenge_guardianId_schoolId_fkey" FOREIGN KEY ("guardianId", "schoolId") REFERENCES "Guardian"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;
