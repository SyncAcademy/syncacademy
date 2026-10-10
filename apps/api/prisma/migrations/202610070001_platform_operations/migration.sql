CREATE TABLE "PlatformLead" (
  "id" UUID NOT NULL PRIMARY KEY,
  "schoolName" TEXT NOT NULL,
  "contactName" TEXT NOT NULL,
  "contactEmail" TEXT NOT NULL,
  "contactPhone" TEXT NOT NULL DEFAULT '',
  "location" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'new',
  "studentCount" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT NOT NULL DEFAULT '',
  "owner" TEXT NOT NULL DEFAULT '',
  "followUp" TEXT NOT NULL DEFAULT '',
  "convertedSchoolId" UUID REFERENCES "School"("id"),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PlatformLead_status_createdAt_idx" ON "PlatformLead"("status", "createdAt");
CREATE TABLE "PlatformSetting" (
  "id" INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
  "platformName" TEXT NOT NULL DEFAULT 'SyncAcademy',
  "supportEmail" TEXT NOT NULL DEFAULT '',
  "maintenanceMessage" TEXT NOT NULL DEFAULT '',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
