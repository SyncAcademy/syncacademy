CREATE TABLE "AcademicWorkspace" ("yearId" UUID PRIMARY KEY REFERENCES "AcademicYear"("id"), "schoolId" UUID NOT NULL REFERENCES "School"("id"), "data" JSONB NOT NULL, "revision" INTEGER NOT NULL DEFAULT 1);
CREATE INDEX "AcademicWorkspace_schoolId_idx" ON "AcademicWorkspace"("schoolId");
