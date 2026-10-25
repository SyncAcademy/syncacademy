ALTER TABLE "ParentAnnouncementMedia"
  ADD COLUMN "storageProvider" TEXT NOT NULL DEFAULT 's3',
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'READY',
  ADD COLUMN "displayKey" TEXT,
  ADD COLUMN "thumbnailKey" TEXT,
  ADD COLUMN "displayByteSize" INTEGER,
  ADD COLUMN "thumbnailByteSize" INTEGER,
  ADD COLUMN "cleanupAfter" TIMESTAMP(3);

CREATE INDEX "ParentAnnouncementMedia_status_cleanupAfter_idx" ON "ParentAnnouncementMedia"("status", "cleanupAfter");
