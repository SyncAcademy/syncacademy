ALTER TABLE "ParentAnnouncement" ADD COLUMN "unpublishedAt" TIMESTAMP(3);
ALTER TABLE "ParentAnnouncement" ALTER COLUMN "publishedAt" DROP NOT NULL;
CREATE TABLE "ParentAnnouncementMedia" (
  "id" UUID NOT NULL,
  "announcementId" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParentAnnouncementMedia_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ParentAnnouncementMedia_announcementId_key" ON "ParentAnnouncementMedia"("announcementId");
CREATE UNIQUE INDEX "ParentAnnouncementMedia_storageKey_key" ON "ParentAnnouncementMedia"("storageKey");
CREATE INDEX "ParentAnnouncementMedia_schoolId_announcementId_idx" ON "ParentAnnouncementMedia"("schoolId", "announcementId");
ALTER TABLE "ParentAnnouncementMedia" ADD CONSTRAINT "ParentAnnouncementMedia_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "ParentAnnouncement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentAnnouncementMedia" ADD CONSTRAINT "ParentAnnouncementMedia_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
