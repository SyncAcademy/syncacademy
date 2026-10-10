-- DropIndex
DROP INDEX "TeachingAssignment_schoolId_membershipId_classroomId_key";

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "admissionDate" DATE,
ADD COLUMN     "guardianName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "guardianPhone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "ownPhone" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Admission" ADD COLUMN     "admissionDate" DATE,
ADD COLUMN     "guardianName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "guardianPhone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "ownPhone" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "TeachingAssignment" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "subjectId" UUID;

-- CreateTable
CREATE TABLE "Subject" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSubject" (
    "schoolId" UUID NOT NULL,
    "classroomId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,

    CONSTRAINT "ClassSubject_pkey" PRIMARY KEY ("schoolId","classroomId","subjectId")
);

-- CreateTable
CREATE TABLE "EnrollmentSubject" (
    "schoolId" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,

    CONSTRAINT "EnrollmentSubject_pkey" PRIMARY KEY ("schoolId","enrollmentId","subjectId")
);

-- CreateTable
CREATE TABLE "RosterIssue" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "studentId" UUID,
    "reportedBy" UUID NOT NULL,
    "issueType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolution" TEXT NOT NULL DEFAULT '',
    "resolvedBy" UUID,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RosterIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentImport" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "yearId" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "rows" JSONB NOT NULL,
    "results" JSONB NOT NULL,
    "cursor" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subject_id_schoolId_key" ON "Subject"("id", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_schoolId_code_key" ON "Subject"("schoolId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_schoolId_name_key" ON "Subject"("schoolId", "name");

-- CreateIndex
CREATE INDEX "RosterIssue_schoolId_status_createdAt_idx" ON "RosterIssue"("schoolId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "StudentImport_schoolId_actorId_createdAt_idx" ON "StudentImport"("schoolId", "actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_id_schoolId_key" ON "Enrollment"("id", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "TeachingAssignment_schoolId_membershipId_classroomId_subjec_key" ON "TeachingAssignment"("schoolId", "membershipId", "classroomId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "TeachingAssignment_id_schoolId_key" ON "TeachingAssignment"("id", "schoolId");

-- AddForeignKey
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_subjectId_schoolId_fkey" FOREIGN KEY ("subjectId", "schoolId") REFERENCES "Subject"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_classroomId_schoolId_fkey" FOREIGN KEY ("classroomId", "schoolId") REFERENCES "Classroom"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_subjectId_schoolId_fkey" FOREIGN KEY ("subjectId", "schoolId") REFERENCES "Subject"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentSubject" ADD CONSTRAINT "EnrollmentSubject_enrollmentId_schoolId_fkey" FOREIGN KEY ("enrollmentId", "schoolId") REFERENCES "Enrollment"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentSubject" ADD CONSTRAINT "EnrollmentSubject_subjectId_schoolId_fkey" FOREIGN KEY ("subjectId", "schoolId") REFERENCES "Subject"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterIssue" ADD CONSTRAINT "RosterIssue_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterIssue" ADD CONSTRAINT "RosterIssue_assignmentId_schoolId_fkey" FOREIGN KEY ("assignmentId", "schoolId") REFERENCES "TeachingAssignment"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentImport" ADD CONSTRAINT "StudentImport_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
