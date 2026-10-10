ALTER TABLE "Student" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Enrollment" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active', ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_status_check" CHECK ("status" IN ('active', 'transferred_out', 'withdrawn', 'graduated'));
CREATE TABLE "Admission" (
 "id" UUID NOT NULL PRIMARY KEY, "schoolId" UUID NOT NULL REFERENCES "School"("id"),
 "yearId" UUID NOT NULL, "requestedClassId" UUID NOT NULL,
 "name" TEXT NOT NULL, "gender" TEXT, "dateOfBirth" DATE, "address" TEXT NOT NULL DEFAULT '',
 "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending','accepted','rejected')),
 "note" TEXT NOT NULL DEFAULT '', "studentId" UUID,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "decidedAt" TIMESTAMP(3),
 FOREIGN KEY ("yearId", "schoolId") REFERENCES "AcademicYear"("id", "schoolId"),
 FOREIGN KEY ("requestedClassId", "schoolId") REFERENCES "Classroom"("id", "schoolId"),
 FOREIGN KEY ("studentId", "schoolId") REFERENCES "Student"("id", "schoolId")
);
CREATE INDEX "Admission_schoolId_yearId_status_idx" ON "Admission"("schoolId", "yearId", "status");
CREATE TABLE "RegistryEvent" (
 "id" UUID NOT NULL PRIMARY KEY, "schoolId" UUID NOT NULL REFERENCES "School"("id"),
 "yearId" UUID NOT NULL, "studentId" UUID, "actorId" UUID NOT NULL REFERENCES "User"("id"),
 "kind" TEXT NOT NULL, "message" TEXT NOT NULL, "fromClassId" UUID, "toClassId" UUID,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY ("yearId", "schoolId") REFERENCES "AcademicYear"("id", "schoolId"),
 FOREIGN KEY ("studentId", "schoolId") REFERENCES "Student"("id", "schoolId"),
 FOREIGN KEY ("fromClassId", "schoolId") REFERENCES "Classroom"("id", "schoolId"),
 FOREIGN KEY ("toClassId", "schoolId") REFERENCES "Classroom"("id", "schoolId")
);
CREATE INDEX "RegistryEvent_schoolId_yearId_createdAt_idx" ON "RegistryEvent"("schoolId", "yearId", "createdAt");
CREATE INDEX "RegistryEvent_schoolId_studentId_idx" ON "RegistryEvent"("schoolId", "studentId");
