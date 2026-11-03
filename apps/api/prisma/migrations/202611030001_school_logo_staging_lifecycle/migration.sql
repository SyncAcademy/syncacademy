-- CreateTable
CREATE TABLE "SchoolLogoObject" (
  "id" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "storageKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'STAGED',
  "createdById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "committedAt" TIMESTAMP(3),
  CONSTRAINT "SchoolLogoObject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolLogoObject_storageKey_key" ON "SchoolLogoObject"("storageKey");
CREATE INDEX "SchoolLogoObject_status_expiresAt_idx" ON "SchoolLogoObject"("status", "expiresAt");
CREATE INDEX "SchoolLogoObject_schoolId_status_idx" ON "SchoolLogoObject"("schoolId", "status");

-- AddForeignKey
ALTER TABLE "SchoolLogoObject"
  ADD CONSTRAINT "SchoolLogoObject_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraints
ALTER TABLE "SchoolLogoObject"
  ADD CONSTRAINT "SchoolLogoObject_status_check"
  CHECK ("status" IN ('STAGED', 'COMMITTED', 'RETIRED', 'CLEANING')),
  ADD CONSTRAINT "SchoolLogoObject_storageKey_format_check"
  CHECK ("storageKey" ~ '^school-logos/[0-9a-f-]{36}/[0-9a-f-]{36}\.png$'),
  ADD CONSTRAINT "SchoolLogoObject_storageKey_school_check"
  CHECK (starts_with("storageKey", 'school-logos/' || "schoolId"::text || '/'));
